# Dokumentasi Project SPARTA Maintenance

Dokumentasi ini adalah rujukan detail untuk developer, operator, dan AI agent yang bekerja di project SPARTA Maintenance.

## Urutan Baca

Untuk developer baru:

1. [Overview](./01-overview.md)
2. [Architecture](./02-architecture.md)
3. [Roles and Access](./03-roles-and-access.md)
4. [Workflows](./04-workflows.md)
5. [Routes and UI](./05-routes-and-ui.md)
6. [Database](./06-database.md)
7. [Integrations and Env](./07-integrations-and-env.md)
8. [Operations](./08-operations.md)
9. [Testing and Verification](./09-testing-and-verification.md)

Untuk operator production:

1. [Integrations and Env](./07-integrations-and-env.md)
2. [Operations](./08-operations.md)
3. [Database](./06-database.md)

Untuk AI agent:

1. Baca `.agents/AI_RULES.md`.
2. Baca `.agents/AI_CONTEXT.md`.
3. Baca dokumen di folder ini sesuai area perubahan.
4. Baca file implementasi aktual sebelum mengubah kode.

## Prinsip Dokumentasi

- README root hanya ringkasan.
- Detail teknis berada di folder ini.
- Jika kode berubah, update dokumen yang relevan pada commit yang sama.
- Jangan menyimpan secret atau credential asli di dokumentasi.
