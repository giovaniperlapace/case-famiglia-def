#!/usr/bin/env ruby
require "csv"
require "json"
require "net/http"
require "optparse"
require "uri"

def parse_options
  options = {
    dry_run: true,
    role: "responsabile_casa",
    batch_size: 200,
  }

  parser = OptionParser.new do |opts|
    opts.banner = "Usage: ruby scripts/import-app-utenti.rb --file /path/utenti.csv [--apply] [--role responsabile_casa]"

    opts.on("--file PATH", "CSV file with Nome,Cognome,Email,Telefono,Accoglienza") { |v| options[:file] = v }
    opts.on("--apply", "Execute import (default is dry-run)") { options[:dry_run] = false }
    opts.on("--role ROLE", "Default role when not in CSV (default: responsabile_casa)") { |v| options[:role] = v }
    opts.on("--batch-size N", Integer, "Rows per request (default: 200)") { |v| options[:batch_size] = v }
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

def normalize_text(value)
  v = value.to_s.strip
  v.empty? ? nil : v
end

def normalize_email(value)
  normalize_text(value)&.downcase
end

def full_name(nome, cognome)
  joined = [normalize_text(nome), normalize_text(cognome)].compact.join(" ").strip
  joined.empty? ? nil : joined
end

def postgrest_upsert(supabase_url, service_key, table, conflict, records, return_representation: false)
  uri = URI("#{supabase_url}/rest/v1/#{table}?on_conflict=#{conflict}")
  req = Net::HTTP::Post.new(uri)
  req["apikey"] = service_key
  req["authorization"] = "Bearer #{service_key}"
  req["content-type"] = "application/json"
  req["accept"] = "application/json"
  req["prefer"] = if return_representation
                    "resolution=merge-duplicates,return=representation"
                  else
                    "resolution=merge-duplicates,return=minimal"
                  end
  req.body = JSON.generate(records)

  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
  unless res.is_a?(Net::HTTPSuccess)
    raise "Supabase upsert failed for #{table} (#{res.code}): #{res.body}"
  end

  return [] unless return_representation
  body = res.body.to_s.strip
  return [] if body.empty?
  JSON.parse(body)
rescue JSON::ParserError
  warn "Warning: non-JSON response from #{table} upsert; continuing with fallback select."
  []
end

def fetch_users_by_emails(supabase_url, service_key, emails)
  return [] if emails.empty?

  in_clause = emails.map { |email| "\"#{email.gsub("\"", "\\\"")}\"" }.join(",")
  uri = URI("#{supabase_url}/rest/v1/app_utenti")
  uri.query = URI.encode_www_form(
    "select" => "id,email",
    "email" => "in.(#{in_clause})"
  )

  req = Net::HTTP::Get.new(uri)
  req["apikey"] = service_key
  req["authorization"] = "Bearer #{service_key}"
  req["accept"] = "application/json"

  res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
  unless res.is_a?(Net::HTTPSuccess)
    raise "Supabase select failed for app_utenti (#{res.code}): #{res.body}"
  end

  body = res.body.to_s.strip
  return [] if body.empty?
  JSON.parse(body)
rescue JSON::ParserError
  warn "Warning: non-JSON response from app_utenti select."
  []
end

options = parse_options
csv_rows = CSV.read(options[:file], headers: true, encoding: "bom|utf-8")

users = []
assignments = []
skipped = []

csv_rows.each_with_index do |row, idx|
  email = normalize_email(row["Email"])
  if email.nil?
    skipped << { row: idx + 2, reason: "missing email" }
    next
  end

  nome = normalize_text(row["Nome"])
  cognome = normalize_text(row["Cognome"])
  telefono = normalize_text(row["Telefono"])
  struttura = normalize_text(row["Accoglienza"])

  users << {
    "email" => email,
    "nome" => nome,
    "cognome" => cognome,
    "nome_completo" => full_name(nome, cognome),
    "telefono" => telefono,
    "ruolo" => options[:role],
    "attivo" => true,
  }

  assignments << {
    email: email,
    struttura: struttura,
  }
end

users_by_email = {}
users.each { |u| users_by_email[u["email"]] = u }
users = users_by_email.values

puts "CSV rows: #{csv_rows.size}"
puts "Users to import: #{users.size}"
puts "Skipped rows: #{skipped.size}"
if skipped.any?
  puts "First skipped rows:"
  skipped.first(5).each { |s| puts "  row #{s[:row]}: #{s[:reason]}" }
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

upserted_users = []
users.each_slice(options[:batch_size]).with_index(1) do |batch, idx|
  result = postgrest_upsert(
    supabase_url,
    service_key,
    "app_utenti",
    "email",
    batch,
    return_representation: true
  )
  upserted_users.concat(result)
  puts "Upserted users batch #{idx} (#{batch.size} rows)"
end

user_id_by_email = {}
upserted_users.each do |u|
  email = normalize_email(u["email"])
  user_id_by_email[email] = u["id"] if email && u["id"]
end

if user_id_by_email.size < users.size
  fetched_users = fetch_users_by_emails(
    supabase_url,
    service_key,
    users.map { |u| u["email"] }
  )

  fetched_users.each do |u|
    email = normalize_email(u["email"])
    user_id_by_email[email] = u["id"] if email && u["id"]
  end
end

strutture_payload = assignments.map do |a|
  utente_id = user_id_by_email[a[:email]]
  struttura = a[:struttura]
  next if utente_id.nil? || struttura.nil?
  { "utente_id" => utente_id, "struttura" => struttura }
end.compact

strutture_payload = strutture_payload.uniq { |r| "#{r["utente_id"]}|#{r["struttura"].downcase}" }

if strutture_payload.any?
  strutture_payload.each_slice(options[:batch_size]).with_index(1) do |batch, idx|
    postgrest_upsert(
      supabase_url,
      service_key,
      "app_utenti_strutture",
      "utente_id,struttura",
      batch,
      return_representation: false
    )
    puts "Upserted assignments batch #{idx} (#{batch.size} rows)"
  end
else
  puts "No structure assignments to import."
end

puts "Import completed successfully."
