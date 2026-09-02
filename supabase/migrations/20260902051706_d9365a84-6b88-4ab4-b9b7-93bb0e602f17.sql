BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.append_match_audit(
	_action text,
	_entity text,
	_entity_id text,
	_summary text,
	_command_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_actor uuid := auth.uid();
	v_name text;
BEGIN
	v_name := COALESCE((SELECT full_name FROM public.profiles WHERE id = v_actor), 'SYSTEM');
	INSERT INTO public.audit_logs (
		id, actor_id, actor_name, action, entity, entity_id, summary, result, command_id
	) VALUES (
		'audit-' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
		COALESCE(v_actor::text, 'SYSTEM'), v_name, _action, _entity, _entity_id, _summary, 'ACCEPTED', _command_id
	);
END;
$$;

REVOKE ALL ON FUNCTION private.append_match_audit(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_match_event(
	_match_id text,
	_command_id text,
	_timestamp integer,
	_period text,
	_team_id text,
	_player_id text,
	_type text,
	_metadata jsonb DEFAULT '{}'::jsonb,
	_expected_version integer DEFAULT NULL
)
RETURNS public.match_events
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	current_match public.matches;
	inserted_event public.match_events;
	next_sequence integer;
	calculated_home_score integer;
	calculated_away_score integer;
BEGIN
	IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), 'match.record_event') THEN
		RAISE EXCEPTION 'Akses pencatatan pertandingan ditolak.' USING ERRCODE = '42501';
	END IF;

	SELECT * INTO current_match FROM public.matches WHERE id = _match_id FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'Pertandingan tidak ditemukan.' USING ERRCODE = 'P0002';
	END IF;
	IF _expected_version IS NOT NULL AND current_match.version <> _expected_version THEN
		RAISE EXCEPTION 'Versi pertandingan sudah berubah. Muat ulang sebelum mencoba lagi.' USING ERRCODE = '40001';
	END IF;
	IF current_match.status NOT IN ('LIVE', 'HALFTIME') THEN
		RAISE EXCEPTION 'Event hanya dapat dicatat saat pertandingan LIVE atau HALFTIME.';
	END IF;
	IF _type NOT IN ('GOAL', 'CARD', 'FOUL', 'SUBSTITUTION', 'TIMEOUT', 'MATCH_CORRECTION') THEN
		RAISE EXCEPTION 'Tipe event tidak valid.';
	END IF;
	IF _timestamp < 0 OR _timestamp > 1200 THEN
		RAISE EXCEPTION 'Waktu event tidak valid.';
	END IF;
	IF current_match.status = 'LIVE' AND _period NOT IN ('FIRST_HALF', 'SECOND_HALF') THEN
		RAISE EXCEPTION 'Periode event tidak sesuai status pertandingan.';
	END IF;
	IF current_match.status = 'HALFTIME' AND _period <> 'HALF_TIME' THEN
		RAISE EXCEPTION 'Periode event tidak sesuai status pertandingan.';
	END IF;
	IF _type IN ('GOAL', 'CARD', 'FOUL', 'SUBSTITUTION', 'TIMEOUT')
		 AND (_team_id IS NULL OR _team_id NOT IN (current_match.home_team_id, current_match.away_team_id)) THEN
		RAISE EXCEPTION 'Tim event tidak mengikuti pertandingan ini.';
	END IF;
	IF _type IN ('GOAL', 'CARD', 'SUBSTITUTION') THEN
		IF _player_id IS NULL OR NOT EXISTS (
			SELECT 1 FROM public.players
			 WHERE id = _player_id AND team_id = _team_id AND status = 'ELIGIBLE'
		) THEN
			RAISE EXCEPTION 'Pemain event tidak eligible atau bukan bagian dari tim.';
		END IF;
	END IF;
	IF _type = 'CARD' AND COALESCE(_metadata ->> 'card', '') NOT IN ('YELLOW', 'RED') THEN
		RAISE EXCEPTION 'Jenis kartu tidak valid.';
	END IF;
	IF _type = 'SUBSTITUTION' AND NOT EXISTS (
		SELECT 1 FROM public.players
		 WHERE id = COALESCE(_metadata ->> 'player_in', '')
			 AND team_id = _team_id AND status = 'ELIGIBLE'
	) THEN
		RAISE EXCEPTION 'Pemain pengganti tidak eligible atau bukan bagian dari tim.';
	END IF;

	SELECT * INTO inserted_event
		FROM public.match_events
	 WHERE match_id = _match_id AND command_id = _command_id;
	IF FOUND THEN
		RETURN inserted_event;
	END IF;

	SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO next_sequence
		FROM public.match_events WHERE match_id = _match_id;

	INSERT INTO public.match_events (
		id, match_id, command_id, sequence_no, timestamp, period, team_id,
		player_id, type, operator_id, metadata
	) VALUES (
		'evt-' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
		_match_id, _command_id, next_sequence, _timestamp, _period, _team_id,
		_player_id, _type, auth.uid()::text, COALESCE(_metadata, '{}'::jsonb)
	) RETURNING * INTO inserted_event;

	SELECT COUNT(*) FILTER (WHERE e.team_id = current_match.home_team_id AND e.type = 'GOAL'),
				 COUNT(*) FILTER (WHERE e.team_id = current_match.away_team_id AND e.type = 'GOAL')
		INTO calculated_home_score, calculated_away_score
		FROM public.match_events e
	 WHERE e.match_id = _match_id;

	UPDATE public.matches
		 SET home_score = calculated_home_score,
				 away_score = calculated_away_score,
				 version = version + 1
	 WHERE id = _match_id AND version = current_match.version;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'Pertandingan berubah selama pencatatan event.' USING ERRCODE = '40001';
	END IF;

	RETURN inserted_event;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_match_status(
	_match_id text,
	_to text,
	_command_id text,
	_expected_version integer DEFAULT NULL
)
RETURNS public.matches
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	current_match public.matches;
	updated_match public.matches;
	new_period text;
	event_type text;
BEGIN
	IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), 'match.manage') THEN
		RAISE EXCEPTION 'Akses perubahan status pertandingan ditolak.' USING ERRCODE = '42501';
	END IF;
	SELECT * INTO current_match FROM public.matches WHERE id = _match_id FOR UPDATE;
	IF NOT FOUND THEN RAISE EXCEPTION 'Pertandingan tidak ditemukan.' USING ERRCODE = 'P0002'; END IF;
	IF _expected_version IS NOT NULL AND current_match.version <> _expected_version THEN
		RAISE EXCEPTION 'Versi pertandingan sudah berubah. Muat ulang sebelum mencoba lagi.' USING ERRCODE = '40001';
	END IF;

	IF NOT (
		(_to = 'CHECK_IN' AND current_match.status = 'SCHEDULED') OR
		(_to = 'LINEUP' AND current_match.status = 'CHECK_IN') OR
		(_to = 'READY' AND current_match.status = 'LINEUP') OR
		(_to = 'LIVE' AND current_match.status IN ('READY', 'HALFTIME')) OR
		(_to = 'HALFTIME' AND current_match.status = 'LIVE') OR
		(_to = 'FULL_TIME' AND current_match.status IN ('LIVE', 'HALFTIME')) OR
		(_to = 'CONFIRMED' AND current_match.status = 'FULL_TIME') OR
		(_to = 'PUBLISHED' AND current_match.status = 'CONFIRMED')
	) THEN
		RAISE EXCEPTION 'Transisi status pertandingan tidak diizinkan.';
	END IF;

	new_period := CASE
		WHEN _to = 'LIVE' AND current_match.status = 'HALFTIME' THEN 'SECOND_HALF'
		WHEN _to = 'LIVE' THEN 'FIRST_HALF'
		WHEN _to = 'HALFTIME' THEN 'HALF_TIME'
		WHEN _to IN ('FULL_TIME', 'CONFIRMED', 'PUBLISHED') THEN 'ENDED'
		ELSE current_match.period
	END;
	event_type := CASE
		WHEN _to = 'LIVE' AND current_match.status = 'HALFTIME' THEN 'PERIOD_START'
		WHEN _to = 'LIVE' THEN 'MATCH_START'
		WHEN _to = 'HALFTIME' THEN 'HALFTIME'
		WHEN _to = 'FULL_TIME' THEN 'MATCH_END'
		ELSE NULL
	END;

	UPDATE public.matches
		 SET status = _to,
				 period = new_period,
				 clock_seconds = CASE WHEN _to = 'LIVE' AND current_match.status = 'READY' THEN 0 ELSE clock_seconds END,
				 version = version + 1
	 WHERE id = _match_id AND version = current_match.version
	 RETURNING * INTO updated_match;
	IF NOT FOUND THEN RAISE EXCEPTION 'Pertandingan berubah selama perubahan status.' USING ERRCODE = '40001'; END IF;

	IF event_type IS NOT NULL THEN
		INSERT INTO public.match_events (
			id, match_id, command_id, sequence_no, timestamp, period, type, operator_id
		) VALUES (
			'evt-' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
			_match_id, _command_id || '-status',
			(SELECT COALESCE(MAX(sequence_no), 0) + 1 FROM public.match_events WHERE match_id = _match_id),
			updated_match.clock_seconds,
			new_period, event_type, auth.uid()::text
		);
	END IF;

	RETURN updated_match;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_match_clock(
	_match_id text,
	_clock_seconds integer,
	_command_id text,
	_expected_version integer DEFAULT NULL
)
RETURNS public.matches
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
	current_match public.matches;
	updated_match public.matches;
BEGIN
	IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), 'match.operate_clock') THEN
		RAISE EXCEPTION 'Akses jam pertandingan ditolak.' USING ERRCODE = '42501';
	END IF;
	IF _clock_seconds < 0 OR _clock_seconds > 1200 THEN RAISE EXCEPTION 'Jam pertandingan tidak valid.'; END IF;
	SELECT * INTO current_match FROM public.matches WHERE id = _match_id FOR UPDATE;
	IF NOT FOUND THEN RAISE EXCEPTION 'Pertandingan tidak ditemukan.' USING ERRCODE = 'P0002'; END IF;
	IF _expected_version IS NOT NULL AND current_match.version <> _expected_version THEN
		RAISE EXCEPTION 'Versi pertandingan sudah berubah. Muat ulang sebelum mencoba lagi.' USING ERRCODE = '40001';
	END IF;
	IF _clock_seconds < current_match.clock_seconds THEN RAISE EXCEPTION 'Jam pertandingan hanya dapat maju.'; END IF;
	IF current_match.status NOT IN ('LIVE', 'HALFTIME') THEN RAISE EXCEPTION 'Jam hanya dapat diubah saat pertandingan berjalan.'; END IF;
	UPDATE public.matches SET clock_seconds = _clock_seconds, version = version + 1
	 WHERE id = _match_id AND version = current_match.version RETURNING * INTO updated_match;
	RETURN updated_match;
END;
$$;

REVOKE ALL ON FUNCTION public.record_match_event(text, text, integer, text, text, text, text, jsonb, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_match_status(text, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_match_clock(text, integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_match_event(text, text, integer, text, text, text, text, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_match_status(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_clock(text, integer, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.before_match_event_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	match_status text;
BEGIN
	SELECT status INTO match_status FROM public.matches WHERE id = NEW.match_id;
	IF match_status IS NULL THEN
		RAISE EXCEPTION 'Pertandingan tidak ditemukan.';
	END IF;
	IF match_status NOT IN ('LIVE', 'HALFTIME') AND NEW.type NOT IN ('MATCH_START', 'PERIOD_START', 'HALFTIME', 'MATCH_END') THEN
		RAISE EXCEPTION 'Event tidak dapat dicatat pada status pertandingan saat ini.';
	END IF;
	RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_match_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
	IF TG_TABLE_NAME = 'match_events' THEN
		PERFORM private.append_match_audit(
			'MATCH_EVENT_CREATE', 'match_events', NEW.match_id,
			'Mencatat ' || NEW.type || ' pada pertandingan', NEW.command_id
		);
	ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
		PERFORM private.append_match_audit(
			'MATCH_STATUS_CHANGE', 'matches', NEW.id,
			'Mengubah status menjadi ' || NEW.status,
			'status-' || NEW.id || '-' || NEW.version::text
		);
	ELSIF NEW.clock_seconds IS DISTINCT FROM OLD.clock_seconds THEN
		PERFORM private.append_match_audit(
			'MATCH_CLOCK_UPDATE', 'matches', NEW.id,
			'Memperbarui jam pertandingan',
			'clock-' || NEW.id || '-' || NEW.version::text
		);
	END IF;
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_match_event_insert ON public.match_events;
CREATE TRIGGER tr_audit_match_event_insert
	AFTER INSERT ON public.match_events
	FOR EACH ROW
	EXECUTE FUNCTION public.audit_match_mutation();

DROP TRIGGER IF EXISTS tr_audit_match_update ON public.matches;
CREATE TRIGGER tr_audit_match_update
	AFTER UPDATE OF status, clock_seconds ON public.matches
	FOR EACH ROW
	EXECUTE FUNCTION public.audit_match_mutation();

REVOKE ALL ON FUNCTION public.before_match_event_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_match_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.before_player_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.before_team_official_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.before_registration_state_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.before_audit_logs_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trigger_role_requests_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_team_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._role_rank(public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gen_random_uuid_text() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_team_id() TO authenticated;

COMMIT;