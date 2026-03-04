#!/usr/bin/env ruby
require "csv"
require "json"
require "net/http"
require "optparse"
require "time"
require "uri"

def parse_options
  options = {
    dry_run: true,
    batch_size: 200,
  }

  parser = OptionParser.new do |opts|
    opts.banner = "Usage: ruby scripts/import-legacy-case-alloggio.rb --file /path/file.csv [--apply] [--batch-size 200]"

    opts.on("--file PATH", "CSV file exported from Tally") { |v| options[:file] = v }
    opts.on("--apply", "Execute import (default is dry-run)") { options[:dry_run] = false }
    opts.on("--batch-size N", Integer, "Rows per upsert request (default: 200)") do |v|
      options[:batch_size] = v
    end
    opts.on("-h", "--help", "Show help") do
      puts opts
      exit 0
    end
  end

  parser.parse!
  unless options[:file]
    warn "Missing required --file"
    warn parser
    exit 1
  end

  if options[:batch_size] <= 0
    warn "--batch-size must be > 0"
    exit 1
  end

  options
end

def normalize_header(value)
  value.to_s
    .unicode_normalize(:nfd)
    .gsub(/\p{Mn}/, "")
    .gsub(/[’`]/, "'")
    .downcase
    .gsub(/[^a-z0-9]+/, " ")
    .strip
end

def normalize_text(value)
  normalized = value.to_s.strip
  normalized.empty? ? nil : normalized
end

def normalize_email(value)
  normalized = normalize_text(value)
  normalized&.downcase
end

def parse_header_to_column_map(ts_path)
  lines = File.readlines(ts_path, chomp: true)
  in_map = false
  pending_key = nil
  mapping = {}

  lines.each do |line|
    in_map = true if line.include?("export const CASE_ALLOGGIO_HEADER_TO_COLUMN")
    next unless in_map
    break if line.include?("} as const")

    stripped = line.strip
    next if stripped.empty?

    if pending_key
      if (m = stripped.match(/^"(.+)"\s*,?$/))
        mapping[pending_key] = m[1]
        pending_key = nil
      end
      next
    end

    if (m = stripped.match(/^"(.+)"\s*:\s*"(.+)"\s*,?$/))
      mapping[m[1]] = m[2]
      next
    end

    if (m = stripped.match(/^([A-Za-z0-9_]+)\s*:\s*"(.+)"\s*,?$/))
      mapping[m[1]] = m[2]
      next
    end

    if (m = stripped.match(/^"(.+)"\s*:\s*$/))
      pending_key = m[1]
    end
  end

  mapping
end

def build_rows(csv_path, header_to_column)
  normalized_header_to_column = {}
  header_to_column.each do |header, column|
    normalized_header_to_column[normalize_header(header)] = column
  end

  csv = CSV.read(csv_path, headers: true, encoding: "bom|utf-8")
  db_columns = header_to_column.values.uniq
  rows = []
  skipped = []

  csv.each_with_index do |csv_row, idx|
    mapped_row = {}
    db_columns.each { |column| mapped_row[column] = nil }

    mapped_answers = {}
    csv_row.headers.each do |header|
      raw_value = csv_row[header]
      value = normalize_text(raw_value)
      mapped_answers[header] = value

      column = normalized_header_to_column[normalize_header(header)]
      mapped_row[column] = value if column
    end

    owner_email =
      normalize_email(mapped_row["contatto_compilatore"]) ||
      normalize_email(mapped_row["contatto_della_persona"])

    submission_id = normalize_text(mapped_row["submission_id"])
    if submission_id.nil? || owner_email.nil?
      skipped << {
        row_number: idx + 2,
        submission_id: submission_id,
        owner_email: owner_email,
        reason: "missing submission_id and/or owner_email",
      }
      next
    end

    rows << mapped_row.merge(
      "owner_email" => owner_email,
      "raw_payload" => {
        "source" => "legacy_csv_import",
        "csv_file" => File.basename(csv_path),
        "csv_row_number" => idx + 2,
        "imported_at" => Time.now.utc.iso8601,
      },
      "mapped_answers" => mapped_answers
    )
  end

  [rows, skipped, csv.size]
end

def upsert_batch(supabase_url, service_key, records)
  uri = URI("#{supabase_url}/rest/v1/case_alloggio_submissions?on_conflict=submission_id")
  request = Net::HTTP::Post.new(uri)
  request["apikey"] = service_key
  request["authorization"] = "Bearer #{service_key}"
  request["content-type"] = "application/json"
  request["prefer"] = "resolution=merge-duplicates,return=minimal"
  request.body = JSON.generate(records)

  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
    http.request(request)
  end

  unless response.is_a?(Net::HTTPSuccess)
    raise "Supabase upsert failed (#{response.code}): #{response.body}"
  end
end

options = parse_options
repo_root = File.expand_path("..", __dir__)
mapping_path = File.join(repo_root, "lib", "tally", "case-alloggio.ts")
header_to_column = parse_header_to_column_map(mapping_path)

if header_to_column.empty?
  warn "Could not parse header mapping from #{mapping_path}"
  exit 1
end

rows, skipped, csv_total = build_rows(options[:file], header_to_column)

puts "CSV rows: #{csv_total}"
puts "Ready for import: #{rows.size}"
puts "Skipped rows: #{skipped.size}"
if skipped.any?
  puts "First skipped rows:"
  skipped.first(5).each do |entry|
    puts "  row #{entry[:row_number]}: #{entry[:reason]}"
  end
end

if options[:dry_run]
  puts "Dry-run only. Re-run with --apply to import."
  exit 0
end

supabase_url = ENV["SUPABASE_URL"] || ENV["NEXT_PUBLIC_SUPABASE_URL"]
service_key = ENV["SUPABASE_SERVICE_ROLE_KEY"]

if supabase_url.to_s.strip.empty? || service_key.to_s.strip.empty?
  warn "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY"
  exit 1
end

rows.each_slice(options[:batch_size]).with_index(1) do |batch, i|
  upsert_batch(supabase_url, service_key, batch)
  puts "Upserted batch #{i} (#{batch.size} rows)"
end

puts "Import completed successfully."
