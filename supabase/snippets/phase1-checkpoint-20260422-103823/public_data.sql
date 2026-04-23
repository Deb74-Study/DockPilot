SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ZchGycr9XMA0sUbHKwBVwCmlZX8z9AJ0PVzf7lg7VG48oxEdgYDOfee1bF02z6l

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: credentials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."credentials" ("id", "login_name", "full_name", "email", "role", "temp_password", "must_change_password", "password_updated_at", "expiry", "access_groups", "created_at", "password_hash") FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

-- \unrestrict ZchGycr9XMA0sUbHKwBVwCmlZX8z9AJ0PVzf7lg7VG48oxEdgYDOfee1bF02z6l

RESET ALL;
