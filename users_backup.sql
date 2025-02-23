--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    email_verification_token text,
    email_verified boolean DEFAULT false,
    telegram_id text,
    telegram_verified_at timestamp without time zone,
    last_login_ip text,
    registration_ip text,
    ip_history jsonb DEFAULT '[]'::jsonb,
    login_history jsonb DEFAULT '[]'::jsonb,
    country text,
    city text,
    last_active timestamp without time zone,
    telegram_verified boolean DEFAULT false,
    goated_username text,
    goated_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, email, is_admin, created_at, email_verification_token, email_verified, telegram_id, telegram_verified_at, last_login_ip, registration_ip, ip_history, login_history, country, city, last_active, telegram_verified, goated_username, goated_verified) FROM stdin;
1	Goombas	Sk84life	Goombas@admin.local	t	2025-02-23 04:02:14.517036	\N	f	\N	\N	\N	\N	[]	[]	\N	\N	\N	f	\N	f
3	testuser1	4d8c12f5ae373ae22c72d3661f929659c7878671a654204baf1407176fef1b32c850dfd6747d9eec6304912d4679da3972a0bb7c75e2c11d57acc35b31abb30d.488a9e322bd9c42c98322b49fe77c31f	test1@example.com	f	2025-02-23 04:07:18.353	\N	f	\N	\N	\N	\N	[]	[]	\N	\N	\N	f	\N	f
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_goated_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_goated_username_key UNIQUE (goated_username);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- PostgreSQL database dump complete
--

