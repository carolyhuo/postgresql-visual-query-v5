export interface ValidationQuery {
  id: number;
  category: 'simple_cte' | 'multi_cte' | 'window_function' | 'combined';
  title: string;
  description: string;
  sql: string;
}

export const VALIDATION_QUERIES: ValidationQuery[] = [
  // =========================================================================
  // KATEGOORIA 1: LIHTSAD ÜHISED TABELIAVALDISED (CTE) (1–5)
  // =========================================================================
  {
    id: 1,
    category: 'simple_cte',
    title: 'CTE suurlinnade filtreerimisega',
    description: 'Lihtne CTE, mis filtreerib välja üle 2 miljoni elanikuga linnad.',
    sql: `WITH large_cities AS (
  SELECT name, countrycode, population
  FROM public.city
  WHERE population > 2000000
)
SELECT name, countrycode, population
FROM large_cities;`,
  },
  {
    id: 2,
    category: 'simple_cte',
    title: 'CTE pindala kriteeriumiga',
    description: 'CTE, mis eraldab riigid pindalaga üle 1 miljoni ruutkilomeetri.',
    sql: `WITH huge_countries AS (
  SELECT code, name, continent, surfacearea
  FROM public.country
  WHERE surfacearea > 1000000
)
SELECT name, continent, surfacearea
FROM huge_countries;`,
  },
  {
    id: 3,
    category: 'simple_cte',
    title: 'CTE veergude ümbernimetamise ja aliasega',
    description: 'CTE, kus väljundveerud on aliastega.',
    sql: `WITH european_nations AS (
  SELECT code AS country_id, name AS country_title, population AS residents
  FROM public.country
  WHERE continent = 'Europe'
)
SELECT country_id, country_title, residents
FROM european_nations;`,
  },
  {
    id: 4,
    category: 'simple_cte',
    title: 'CTE agregeerimisega (GROUP BY riigiti)',
    description: 'CTE arvutab iga riigi linnade koguarvu ja summaarse elanike arvu.',
    sql: `WITH country_city_stats AS (
  SELECT countrycode, COUNT(id) AS total_cities, SUM(population) AS urban_population
  FROM public.city
  GROUP BY countrycode
)
SELECT countrycode, total_cities, urban_population
FROM country_city_stats;`,
  },
  {
    id: 5,
    category: 'simple_cte',
    title: 'CTE ametlike keelte loendamiseks',
    description: 'CTE filtreerib ainult ametlikud keeled ja loeb need riigiti kokku.',
    sql: `WITH official_languages AS (
  SELECT countrycode, COUNT(language) AS official_lang_count
  FROM public.countrylanguage
  WHERE isofficial = true
  GROUP BY countrycode
)
SELECT countrycode, official_lang_count
FROM official_languages;`,
  },

  // =========================================================================
  // KATEGOORIA 2: AHELDATUD JA MITMIK-CTE-D (6–10)
  // =========================================================================
  {
    id: 6,
    category: 'multi_cte',
    title: 'Kaks sõltumatut CTE-d liidetud põhipäringus',
    description: 'Linnade ja riikide CTE-d luuakse eraldi ja ühendatakse põhipäringus.',
    sql: `WITH big_cities AS (
  SELECT countrycode, name AS city_name, population AS city_pop
  FROM public.city
  WHERE population > 3000000
),
big_countries AS (
  SELECT code, name AS country_name, continent
  FROM public.country
  WHERE population > 50000000
)
SELECT big_countries.country_name, big_cities.city_name, big_cities.city_pop
FROM big_countries
INNER JOIN big_cities ON big_countries.code = big_cities.countrycode;`,
  },
  {
    id: 7,
    category: 'multi_cte',
    title: 'Aheldatud CTE (CTE 2 loeb andmeid CTE 1-st)',
    description: 'Esimene CTE agregeerib ja teine CTE filtreerib agregeeritud tulemust.',
    sql: `WITH raw_city_sums AS (
  SELECT countrycode, COUNT(id) AS city_count, SUM(population) AS total_city_pop
  FROM public.city
  GROUP BY countrycode
),
major_urban_nations AS (
  SELECT countrycode, total_city_pop
  FROM raw_city_sums
  WHERE city_count >= 5
)
SELECT countrycode, total_city_pop
FROM major_urban_nations;`,
  },
  {
    id: 8,
    category: 'multi_cte',
    title: 'CTE liidetud baastabeliga (INNER JOIN)',
    description: 'CTE suurlinnadega liidetakse riikide baastabeliga.',
    sql: `WITH filtered_cities AS (
  SELECT countrycode, name, population
  FROM public.city
  WHERE population > 1500000
)
SELECT country.name AS country_name, filtered_cities.name AS city_name, filtered_cities.population
FROM public.country
INNER JOIN filtered_cities ON country.code = filtered_cities.countrycode;`,
  },
  {
    id: 9,
    category: 'multi_cte',
    title: 'Kaks agregeeritud CTE-d ja baastabeli JOIN',
    description: 'Põhipäring ühendab riigi tabeliga linnade ja keelte agregeeritud vahetulemused.',
    sql: `WITH city_agg AS (
  SELECT countrycode, COUNT(id) AS cities_count
  FROM public.city
  GROUP BY countrycode
),
lang_agg AS (
  SELECT countrycode, COUNT(language) AS languages_count
  FROM public.countrylanguage
  GROUP BY countrycode
)
SELECT country.name, city_agg.cities_count, lang_agg.languages_count
FROM public.country
INNER JOIN city_agg ON country.code = city_agg.countrycode
INNER JOIN lang_agg ON country.code = lang_agg.countrycode;`,
  },
  {
    id: 10,
    category: 'multi_cte',
    title: 'Mitme vahetabeli andmete filtreerimine põhipäringus',
    description: 'Kaks vahetabelit Euroopa ja Aasia kohta, mis kombineeritakse põhipäringus.',
    sql: `WITH euro_countries AS (
  SELECT code, name, population FROM public.country WHERE continent = 'Europe'
),
asia_countries AS (
  SELECT code, name, population FROM public.country WHERE continent = 'Asia'
)
SELECT euro_countries.name AS euro_country, euro_countries.population
FROM euro_countries
WHERE euro_countries.population > 10000000;`,
  },

  // =========================================================================
  // KATEGOORIA 3: AKNAFUNKTSIOONID (11–18)
  // =========================================================================
  {
    id: 11,
    category: 'window_function',
    title: 'Lihtne ROW_NUMBER üle tabeli',
    description: 'Määrab linnadele unikaalse järjenumbri nime järgi.',
    sql: `SELECT name, countrycode, population,
       ROW_NUMBER() OVER (ORDER BY name ASC) AS row_num
FROM public.city;`,
  },
  {
    id: 12,
    category: 'window_function',
    title: 'Globaalne elanike pingerida (RANK)',
    description: 'Määrab linnadele globaalse pingerea elanike arvu järgi kahanevalt.',
    sql: `SELECT name, countrycode, population,
       RANK() OVER (ORDER BY population DESC) AS global_rank
FROM public.city;`,
  },
  {
    id: 13,
    category: 'window_function',
    title: 'Tihe pingerida ilma lünkadeta (DENSE_RANK)',
    description: 'Arvutab riikidele pingerea RKT (GNP) järgi ilma vahelejäävate kohtadeta.',
    sql: `SELECT name, continent, gnp,
       DENSE_RANK() OVER (ORDER BY gnp DESC) AS gnp_rank
FROM public.country;`,
  },
  {
    id: 14,
    category: 'window_function',
    title: 'Partitsioneeritud pingerida mandrite kaupa',
    description: 'Pingerida arvestatakse iga mandri sees eraldiseisvalt.',
    sql: `SELECT name, continent, population,
       RANK() OVER (PARTITION BY continent ORDER BY population DESC) AS continent_rank
FROM public.country;`,
  },
  {
    id: 15,
    category: 'window_function',
    title: 'Kumulatiivne summa aknafunktsiooniga',
    description: 'Arvutab jooksva kumulatiivse rahvaarvu riigisiseselt.',
    sql: `SELECT name, countrycode, population,
       SUM(population) OVER (PARTITION BY countrycode ORDER BY population DESC) AS running_pop
FROM public.city;`,
  },
  {
    id: 16,
    category: 'window_function',
    title: 'Nihkefunktsioon LAG eelmise väärtuse lugemiseks',
    description: 'Võrdleb linna rahvaarvu samas riigis vahetult eelneva suurema linnaga.',
    sql: `SELECT name, countrycode, population,
       LAG(population) OVER (PARTITION BY countrycode ORDER BY population DESC) AS prev_city_pop
FROM public.city;`,
  },
  {
    id: 17,
    category: 'window_function',
    title: 'Nihkefunktsioon LEAD järgmise väärtuse lugemiseks',
    description: 'Kuvab riigi RKT kõrval mandri järgmise riigi RKT väärtuse.',
    sql: `SELECT name, continent, gnp,
       LEAD(gnp) OVER (PARTITION BY continent ORDER BY gnp DESC) AS next_country_gnp
FROM public.country;`,
  },
  {
    id: 18,
    category: 'window_function',
    title: 'Mitu aknafunktsiooni samas päringus',
    description: 'Kuvab samaaegselt nii riigisisese järjekorra kui ka globaalse pingerea.',
    sql: `SELECT name, countrycode, population,
       ROW_NUMBER() OVER (PARTITION BY countrycode ORDER BY population DESC) AS country_city_seq,
       RANK() OVER (ORDER BY population DESC) AS world_rank
FROM public.city;`,
  },

  // =========================================================================
  // KATEGOORIA 4: CTE-D JA AKNAFUNKTSIOONID (19–25)
  // =========================================================================
  {
    id: 19,
    category: 'combined',
    title: 'Iga riigi suurim linn (esikoha filtreerimine)',
    description: 'CTE arvutab linnade riigisisese pingerea ja põhipäring filtreerib esikoha.',
    sql: `WITH ranked_cities AS (
  SELECT name, countrycode, population,
         RANK() OVER (PARTITION BY countrycode ORDER BY population DESC) AS rnk
  FROM public.city
)
SELECT countrycode, name AS top_city, population
FROM ranked_cities
WHERE rnk = 1;`,
  },
  {
    id: 20,
    category: 'combined',
    title: 'Mandrite suurlinnade pingerida koos HAVING klausliga',
    description: 'CTE agregeerib ja filtreerib HAVING-iga, põhipäring teeb mandripõhise pingerea.',
    sql: `WITH city_summary AS (
  SELECT countrycode, COUNT(name) AS large_cities_count, SUM(population) AS large_cities_population
  FROM public.city
  GROUP BY countrycode
  HAVING (SUM(population) > 500000)
)
SELECT country.continent, country.name, city_summary.large_cities_population,
       DENSE_RANK() OVER (PARTITION BY country.continent ORDER BY city_summary.large_cities_population DESC) AS continent_rank
FROM public.country
INNER JOIN city_summary ON country.code = city_summary.countrycode;`,
  },
  {
    id: 21,
    category: 'combined',
    title: 'CTE aknafunktsiooniga liidetud teise tabeliga',
    description: 'CTE reastab riigid RKT järgi, põhipäring liidab riigi ametliku keele.',
    sql: `WITH ranked_countries AS (
  SELECT code, name, continent, gnp,
         DENSE_RANK() OVER (PARTITION BY continent ORDER BY gnp DESC) AS gnp_rank
  FROM public.country
)
SELECT ranked_countries.name, ranked_countries.continent, ranked_countries.gnp_rank, countrylanguage.language
FROM ranked_countries
INNER JOIN public.countrylanguage ON ranked_countries.code = countrylanguage.countrycode
WHERE countrylanguage.isofficial = true;`,
  },
  {
    id: 22,
    category: 'combined',
    title: 'CTE sees tehtud aknafunktsiooni vahe arvutamine',
    description: 'CTE arvutab LAG-iga eelmise väärtuse ja põhipäring filtreerib tulemust.',
    sql: `WITH city_lags AS (
  SELECT name, countrycode, population,
         LAG(population) OVER (PARTITION BY countrycode ORDER BY population DESC) AS prev_pop
  FROM public.city
)
SELECT name, countrycode, population, prev_pop
FROM city_lags
WHERE prev_pop IS NOT NULL;`,
  },
  {
    id: 23,
    category: 'combined',
    title: 'Mitmik-CTE ja aknafunktsioon põhipäringus',
    description: 'Kaks vahetabelit arvutavad summad ja põhipäring paneb tulemused pingeritta.',
    sql: `WITH c1 AS (
  SELECT countrycode, SUM(population) AS city_pop FROM public.city GROUP BY countrycode
),
c2 AS (
  SELECT code, name, continent FROM public.country WHERE population > 10000000
)
SELECT c2.name, c2.continent, c1.city_pop,
       RANK() OVER (PARTITION BY c2.continent ORDER BY c1.city_pop DESC) AS regional_rank
FROM c2
INNER JOIN c1 ON c2.code = c1.countrycode;`,
  },
  {
    id: 24,
    category: 'combined',
    title: 'CTE ja aknafunktsioon koos WHERE filtriga põhipäringus',
    description: 'Põhipäring filtreerib konkreetse mandri ja seab riigid suurlinnade järgi pingeritta.',
    sql: `WITH urban_summary AS (
  SELECT countrycode, SUM(population) AS urban_pop
  FROM public.city
  GROUP BY countrycode
)
SELECT country.name, urban_summary.urban_pop,
       DENSE_RANK() OVER (ORDER BY urban_summary.urban_pop DESC) AS euro_rank
FROM public.country
INNER JOIN urban_summary ON country.code = urban_summary.countrycode
WHERE country.continent = 'Europe';`,
  },
  {
    id: 25,
    category: 'combined',
    title: 'Iga riigi esikolmiku linnade filtreerimine (Top-3)',
    description: 'CTE nummerdab linnad riigis ja põhipäring jätab alles iga riigi esikolmiku.',
    sql: `WITH numbered_cities AS (
  SELECT name, countrycode, population,
         ROW_NUMBER() OVER (PARTITION BY countrycode ORDER BY population DESC) AS city_order
  FROM public.city
)
SELECT countrycode, name, population, city_order
FROM numbered_cities
WHERE city_order <= 3;`,
  },
];
