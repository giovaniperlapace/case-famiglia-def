update public.case_alloggio_submissions
set dove_dorme = 'Casa trovata autonomamente'
where dove_dorme = 'Casa';

update public.case_alloggio_submissions
set dove_dormiva = 'Casa trovata autonomamente'
where dove_dormiva = 'Casa';
