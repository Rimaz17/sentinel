-- The 25 administrative districts of Sri Lanka. Every facility and every report
-- belongs to exactly one, and detection compares each district against its own
-- history.
--
-- The three-letter code is Sentinel's own shorthand, chosen so that no two codes
-- are easily confused (Matale MTL, Mullaitivu MUL). It is the prefix of facility
-- invite codes, as in KDY-H01-7X2M for a facility in Kandy.

create table districts (
    code     text primary key,
    name     text not null unique,
    province text not null,
    constraint districts_code_format check (code ~ '^[A-Z]{3}$')
);

insert into districts (code, name, province) values
    ('CMB', 'Colombo',      'Western'),
    ('GMP', 'Gampaha',      'Western'),
    ('KLT', 'Kalutara',     'Western'),
    ('KDY', 'Kandy',        'Central'),
    ('MTL', 'Matale',       'Central'),
    ('NEL', 'Nuwara Eliya', 'Central'),
    ('GAL', 'Galle',        'Southern'),
    ('MTR', 'Matara',       'Southern'),
    ('HMB', 'Hambantota',   'Southern'),
    ('JAF', 'Jaffna',       'Northern'),
    ('KIL', 'Kilinochchi',  'Northern'),
    ('MNR', 'Mannar',       'Northern'),
    ('VAV', 'Vavuniya',     'Northern'),
    ('MUL', 'Mullaitivu',   'Northern'),
    ('BTC', 'Batticaloa',   'Eastern'),
    ('AMP', 'Ampara',       'Eastern'),
    ('TRC', 'Trincomalee',  'Eastern'),
    ('KUR', 'Kurunegala',   'North Western'),
    ('PTM', 'Puttalam',     'North Western'),
    ('ANU', 'Anuradhapura', 'North Central'),
    ('POL', 'Polonnaruwa',  'North Central'),
    ('BDL', 'Badulla',      'Uva'),
    ('MON', 'Monaragala',   'Uva'),
    ('RAT', 'Ratnapura',    'Sabaragamuwa'),
    ('KEG', 'Kegalle',      'Sabaragamuwa');
