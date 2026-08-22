extends Node

const SAMPLE_RATE: int = 22050
const BGM_VOLUME_DB: float = -15.0
const BGM_DUCKED_DB: float = -28.0
const BGM_FADE_SECONDS: float = 0.8
const SFX_PLAYER_COUNT: int = 8

var bgm_players: Array[AudioStreamPlayer] = []
var sfx_players: Array[AudioStreamPlayer] = []
var bgm_streams: Dictionary = {}
var sfx_streams: Dictionary = {}
var active_bgm_player: int = 0
var current_stage: int = -1
var sfx_cursor: int = 0
var silence_reasons: Dictionary = {}
var audio_silenced: bool = false
var silence_release_version: int = 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_create_players()
	_build_sfx_streams()
	GameState.biome_changed.connect(play_stage_music)
	GameState.game_started.connect(_on_game_started)
	GameState.game_over.connect(_on_game_over)
	get_tree().node_added.connect(_on_node_added)
	call_deferred("_connect_existing_buttons")
	play_stage_music(0)
	call_deferred("_precache_remaining_music")

func _create_players() -> void:
	for i in range(2):
		var player = AudioStreamPlayer.new()
		player.name = "BGM%d" % (i + 1)
		player.volume_db = -40.0
		add_child(player)
		bgm_players.append(player)

	for i in range(SFX_PLAYER_COUNT):
		var player = AudioStreamPlayer.new()
		player.name = "SFX%d" % (i + 1)
		player.volume_db = -5.0
		add_child(player)
		sfx_players.append(player)

func _precache_remaining_music() -> void:
	# Build one track per frame while the title screen is visible so a biome
	# transition never has to synthesize audio during active play.
	for stage_idx in range(1, 4):
		await get_tree().process_frame
		if not bgm_streams.has(stage_idx):
			bgm_streams[stage_idx] = _make_bgm(stage_idx)

func play_stage_music(stage_idx: int) -> void:
	stage_idx = clampi(stage_idx, 0, 3)
	if current_stage == stage_idx and bgm_players[active_bgm_player].playing:
		return
	if not bgm_streams.has(stage_idx):
		bgm_streams[stage_idx] = _make_bgm(stage_idx)

	var old_player = bgm_players[active_bgm_player]
	active_bgm_player = 1 - active_bgm_player
	var new_player = bgm_players[active_bgm_player]
	new_player.stream = bgm_streams[stage_idx]
	new_player.volume_db = -40.0
	new_player.play()
	new_player.stream_paused = audio_silenced
	current_stage = stage_idx

	var tween = create_tween()
	tween.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tween.parallel().tween_property(new_player, "volume_db", BGM_VOLUME_DB, BGM_FADE_SECONDS)
	if old_player.playing:
		tween.parallel().tween_property(old_player, "volume_db", -40.0, BGM_FADE_SECONDS)
		tween.tween_callback(old_player.stop)

func play_sfx(effect_name: String) -> void:
	if audio_silenced:
		return
	if not sfx_streams.has(effect_name):
		return
	var player = _next_sfx_player()
	player.stream = sfx_streams[effect_name]
	player.pitch_scale = randf_range(0.985, 1.015) if effect_name != "game_over" else 1.0
	player.play()

func set_silenced(reason: String, silenced: bool) -> void:
	if silenced:
		silence_reasons[reason] = true
	else:
		silence_reasons.erase(reason)

	silence_release_version += 1
	if not silence_reasons.is_empty():
		_apply_silence()
	elif audio_silenced:
		# Keep the button that closes the review screen silent as well. Global
		# button callbacks run later in the same pressed-signal dispatch.
		call_deferred("_release_silence", silence_release_version)

func _apply_silence() -> void:
	audio_silenced = true
	for player in bgm_players:
		player.stream_paused = true
	for player in sfx_players:
		player.stop()

func _release_silence(version: int) -> void:
	if version != silence_release_version or not silence_reasons.is_empty():
		return
	audio_silenced = false
	for player in bgm_players:
		player.stream_paused = false

func _next_sfx_player() -> AudioStreamPlayer:
	for player in sfx_players:
		if not player.playing:
			return player
	var player = sfx_players[sfx_cursor]
	sfx_cursor = (sfx_cursor + 1) % sfx_players.size()
	return player

func _on_game_started() -> void:
	var player = bgm_players[active_bgm_player]
	if not player.playing:
		play_stage_music(maxi(current_stage, 0))
	else:
		create_tween().tween_property(player, "volume_db", BGM_VOLUME_DB, 0.45)

func _on_game_over() -> void:
	play_sfx("game_over")
	create_tween().tween_property(bgm_players[active_bgm_player], "volume_db", BGM_DUCKED_DB, 0.55)

func _on_node_added(node: Node) -> void:
	if node is BaseButton:
		call_deferred("_connect_button", node)

func _connect_existing_buttons() -> void:
	_connect_buttons_recursive(get_tree().root)

func _connect_buttons_recursive(node: Node) -> void:
	if node is BaseButton:
		_connect_button(node)
	for child in node.get_children():
		_connect_buttons_recursive(child)

func _connect_button(button: BaseButton) -> void:
	if is_instance_valid(button) and not button.pressed.is_connected(_on_button_pressed):
		button.pressed.connect(_on_button_pressed)

func _on_button_pressed() -> void:
	play_sfx("button")

func _build_sfx_streams() -> void:
	for effect_name in ["jump", "attack", "correct", "wrong", "mystery", "game_over", "button", "hurt", "monster_hit", "monster_defeat"]:
		sfx_streams[effect_name] = _make_sfx(effect_name)

func _make_sfx(effect_name: String) -> AudioStreamWAV:
	var duration = 0.2
	match effect_name:
		"attack": duration = 0.24
		"correct": duration = 0.42
		"wrong": duration = 0.44
		"mystery": duration = 0.62
		"game_over": duration = 1.35
		"button": duration = 0.075
		"hurt": duration = 0.3
		"monster_hit": duration = 0.16
		"monster_defeat": duration = 0.5

	var sample_count = int(duration * SAMPLE_RATE)
	var bytes = PackedByteArray()
	bytes.resize(sample_count * 2)
	for i in range(sample_count):
		var t = float(i) / SAMPLE_RATE
		var progress = t / duration
		var envelope = pow(maxf(0.0, 1.0 - progress), 1.7)
		var value = 0.0
		match effect_name:
			"jump":
				var freq = lerpf(260.0, 760.0, progress)
				value = (_square(freq, t) * 0.42 + sin(TAU * freq * t) * 0.58) * envelope
			"attack":
				var freq = lerpf(190.0, 62.0, progress)
				var impact = sin(TAU * freq * t) * 0.62 + _square(freq * 2.03, t) * 0.22
				value = impact * pow(maxf(0.0, 1.0 - progress), 1.25)
			"correct":
				var notes = [72, 76, 79, 84]
				var note_idx = mini(int(progress * notes.size()), notes.size() - 1)
				var note_t = fmod(t, duration / notes.size())
				value = (_triangle(_midi_to_freq(notes[note_idx]), note_t) * 0.65 + sin(TAU * _midi_to_freq(notes[note_idx] + 12) * note_t) * 0.2) * envelope
			"wrong":
				var freq = lerpf(245.0, 92.0, progress)
				value = (_square(freq, t) * 0.5 + _triangle(freq * 0.5, t) * 0.35) * envelope
			"mystery":
				var notes = [79, 84, 88, 91, 96]
				var note_idx = mini(int(progress * notes.size()), notes.size() - 1)
				var note_t = fmod(t, duration / notes.size())
				var freq = _midi_to_freq(notes[note_idx])
				value = (sin(TAU * freq * note_t) * 0.62 + sin(TAU * freq * 2.0 * note_t) * 0.2) * envelope
			"game_over":
				var notes = [60, 57, 53, 48]
				var note_idx = mini(int(progress * notes.size()), notes.size() - 1)
				var note_t = fmod(t, duration / notes.size())
				var freq = _midi_to_freq(notes[note_idx])
				value = (_triangle(freq, note_t) * 0.58 + sin(TAU * freq * 0.5 * note_t) * 0.25) * envelope
			"button":
				var freq = lerpf(920.0, 610.0, progress)
				value = sin(TAU * freq * t) * envelope
			"hurt":
				var freq = lerpf(180.0, 75.0, progress)
				value = (_square(freq, t) * 0.45 + sin(TAU * freq * 0.5 * t) * 0.35) * envelope
			"monster_hit":
				var freq = lerpf(135.0, 58.0, progress)
				value = (sin(TAU * freq * t) * 0.6 + _square(freq * 2.0, t) * 0.25) * envelope
			"monster_defeat":
				var notes = [48, 55, 60, 67]
				var note_idx = mini(int(progress * notes.size()), notes.size() - 1)
				var note_t = fmod(t, duration / notes.size())
				value = _triangle(_midi_to_freq(notes[note_idx]), note_t) * envelope

		_write_sample(bytes, i, value * 0.72)
	return _make_wav(bytes, sample_count, false)

func _make_bgm(stage_idx: int) -> AudioStreamWAV:
	var step_seconds = [0.24, 0.205, 0.28, 0.34][stage_idx]
	var melodies = [
		[72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 81, 79, 76, 74, 69, 72, 76, 72, 67, 71, 74, 79, 72, 76, 79, 76, 74, 71, 69, 67],
		[57, 60, 64, 60, 56, 59, 63, 59, 57, 60, 65, 64, 60, 59, 56, 52, 57, 64, 63, 60, 56, 59, 60, 64, 65, 64, 60, 59, 56, 52, 55, 56],
		[72, 79, 76, 83, 74, 81, 77, 84, 72, 79, 76, 86, 83, 79, 76, 74, 69, 76, 72, 79, 71, 77, 74, 81, 72, 79, 83, 79, 76, 74, 71, 67],
		[65, 69, 72, 76, 67, 71, 74, 77, 65, 72, 69, 76, 67, 74, 71, 77, 64, 67, 71, 74, 62, 65, 69, 72, 60, 64, 67, 72, 64, 67, 71, 76],
	]
	var bass_roots = [48, 45, 48, 41]
	var melody: Array = melodies[stage_idx]
	var duration = step_seconds * melody.size()
	var sample_count = int(duration * SAMPLE_RATE)
	var bytes = PackedByteArray()
	bytes.resize(sample_count * 2)

	for i in range(sample_count):
		var t = float(i) / SAMPLE_RATE
		var step_idx = mini(int(t / step_seconds), melody.size() - 1)
		var step_t = fmod(t, step_seconds)
		var note_env = pow(maxf(0.0, 1.0 - step_t / step_seconds), 0.65)
		var melody_freq = _midi_to_freq(melody[step_idx])
		var bass_note = bass_roots[stage_idx] + ([0, 0, 5, 0, 3, 3, 5, 7][int(step_idx / 4) % 8])
		var bass_freq = _midi_to_freq(bass_note)
		var value = 0.0

		match stage_idx:
			0: # Jungle: bright wooden-marimba pulse
				value = _triangle(melody_freq, t) * note_env * 0.22
				value += _triangle(bass_freq, t) * 0.13
				value += sin(TAU * 72.0 * step_t) * exp(-18.0 * step_t) * 0.12
			1: # Volcano: urgent minor pulse with a heavy low beat
				value = _square(melody_freq, t) * note_env * 0.16
				value += _triangle(bass_freq, t) * 0.18
				value += sin(TAU * lerpf(105.0, 48.0, step_t / step_seconds) * step_t) * exp(-15.0 * step_t) * 0.2
			2: # Starlight: airy arpeggio and octave shimmer
				value = sin(TAU * melody_freq * t) * note_env * 0.18
				value += sin(TAU * melody_freq * 2.0 * t) * note_env * 0.08
				value += _triangle(bass_freq, t) * 0.09
			3: # Glacier: slow crystalline bell pattern
				value = _triangle(melody_freq, t) * note_env * 0.16
				value += sin(TAU * melody_freq * 1.5 * t) * note_env * 0.08
				value += sin(TAU * bass_freq * t) * 0.12

		var loop_fade = minf(1.0, minf(t / 0.025, (duration - t) / 0.025))
		_write_sample(bytes, i, value * loop_fade)
	return _make_wav(bytes, sample_count, true)

func _make_wav(bytes: PackedByteArray, sample_count: int, should_loop: bool) -> AudioStreamWAV:
	var stream = AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = SAMPLE_RATE
	stream.stereo = false
	stream.data = bytes
	if should_loop:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = sample_count
	return stream

func _write_sample(bytes: PackedByteArray, sample_idx: int, value: float) -> void:
	var pcm_value = int(clampf(value, -1.0, 1.0) * 32767.0)
	bytes.encode_s16(sample_idx * 2, pcm_value)

func _midi_to_freq(note: int) -> float:
	return 440.0 * pow(2.0, (float(note) - 69.0) / 12.0)

func _square(freq: float, t: float) -> float:
	return 1.0 if sin(TAU * freq * t) >= 0.0 else -1.0

func _triangle(freq: float, t: float) -> float:
	return asin(sin(TAU * freq * t)) * (2.0 / PI)
