# Local Development Setup Guide

This guide sets up PostgreSQL, loads the included `world.sql` sample data, and
runs the query builder on your machine.

## Requirements

- Node.js and npm
- PostgreSQL running locally
- The PostgreSQL command-line client (`psql`)

## Create a PostgreSQL login and sample database

Open a terminal and connect to the default `postgres` database using a local
PostgreSQL administrator role. For a Homebrew installation, for example:

```bash
psql -d postgres
```

In the `psql` prompt, create a dedicated application login, allow it to connect
to the default database (the app uses that connection to list databases), and
create a sample database owned by that login. Replace the example password
with a strong password of your own:

```sql
CREATE ROLE visual_query LOGIN PASSWORD 'password';
GRANT CONNECT ON DATABASE postgres TO visual_query;
CREATE DATABASE world OWNER visual_query;
```

These commands are for a fresh setup. If you already created the `world`
database or a login role, do not create it again; use the existing database
and role, or choose different names. To inspect existing roles from `psql`,
run `\du`. In an IDE SQL console, use:

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcanlogin
FROM pg_roles
ORDER BY rolname;
```

Exit `psql` with `\q`.

## Import the sample data

From a terminal in the repository root, import `world.sql` into the new
database:

```bash
psql -h localhost -p 5432 -U visual_query -d world -W -v ON_ERROR_STOP=1 -f world.sql
```

Enter the password created above when prompted. If `psql` is not on your PATH
on a Homebrew macOS installation, use its full path:

```bash
/opt/homebrew/bin/psql -h localhost -p 5432 -U visual_query -d world -W -v ON_ERROR_STOP=1 -f world.sql
```

Run this import once against an empty database. `world.sql` creates and
populates `city`, `country`, and `countrylanguage` in the `public` schema; it
also adds their primary and foreign keys. It uses PostgreSQL `COPY FROM stdin`,
so import it with `psql` rather than IntelliJ's Database SQL console.

## Configure and start the app

Create local environment files from the examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The server defaults to API port `8081`; the client example is configured to
use that port. The server `.env` sets PostgreSQL host and port. For a local
PostgreSQL installation, the defaults (`localhost` and `5432`) are usually
right.

Install dependencies and start the server in one terminal from the repository
root:

```bash
npm install --prefix server
npm start --prefix server
```

Start the client in a second terminal:

```bash
npm install --prefix client
npm start --prefix client
```

Open [http://localhost:3000](http://localhost:3000). Log in with:

- **Server:** `localhost`
- **Port:** `5432`
- **Username:** `visual_query`
- **Password:** the password set when creating the role
- **Database:** choose `world` after login

Refresh the database/table tree in IntelliJ's Database tool window to see
`public.city`, `public.country`, and `public.countrylanguage`.

## Using an existing database

If you want to connect the app login to an existing database instead of
creating `world`, run the following as that database's owner or a PostgreSQL
administrator. Replace `your_database` with its name:

```sql
GRANT CONNECT ON DATABASE your_database TO visual_query;
```

Then connect the SQL console to `your_database` and grant access to its
`public` schema and existing tables:

```sql
GRANT USAGE, CREATE ON SCHEMA public TO visual_query;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO visual_query;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO visual_query;
```

The application does not create application-specific tables. For local
experiments, you can use the included `world.sql` sample database.
