# Database

Supabase PostgreSQL schema and migration documentation for NursePrep will be maintained here.

The application is designed local-first: quiz sessions and progress must remain usable without a network connection. Supabase is the authenticated cloud backup and synchronization layer, not a runtime dependency for taking an offline quiz.

Database schema changes will be tracked as versioned SQL migrations. User-owned records must be protected with Row Level Security (RLS). Never commit service-role keys or other secrets.
