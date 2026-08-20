extends ParallaxBackground

var current_scroll_x: float = 0.0
var layers: Array[ParallaxLayer] = []
var current_biome_idx: int = -1
var is_transitioning: bool = false

@onready var sky_sprite: Sprite2D = $SkyLayer/SkySprite
@onready var rocks_sprite: Sprite2D = $RocksLayer/RocksSprite
@onready var clouds_sprite: Sprite2D = $CloudsLayer/CloudsSprite
@onready var hills_far_sprite: Sprite2D = $HillsFarLayer/HillsFarSprite
@onready var hills_mid_sprite: Sprite2D = $HillsMidLayer/HillsMidSprite
@onready var trees_near_sprite: Sprite2D = $TreesNearLayer/TreesNearSprite
@onready var ground_sprite: Sprite2D = $GroundLayer/GroundSprite

const BIOMES = [
	{
		"id": "jungle",
		"name": "쥐라기 에메랄드 원시 밀림",
		"sky": preload("res://assets/sprites/biomes/biome_jungle/sky.png"),
		"far_rocks": preload("res://assets/sprites/biomes/biome_jungle/far_rocks.png"),
		"clouds": preload("res://assets/sprites/biomes/biome_jungle/clouds.png"),
		"mid_hills": preload("res://assets/sprites/biomes/biome_jungle/mid_hills.png"),
		"near_trees": preload("res://assets/sprites/biomes/biome_jungle/near_trees.png"),
		"ground": preload("res://assets/sprites/biomes/biome_jungle/ground.png"),
	},
	{
		"id": "volcano",
		"name": "화산 암석 & 붉은 마그마 협곡",
		"sky": preload("res://assets/sprites/biomes/biome_volcano/sky.png"),
		"far_rocks": preload("res://assets/sprites/biomes/biome_volcano/far_rocks.png"),
		"clouds": preload("res://assets/sprites/biomes/biome_volcano/clouds.png"),
		"mid_hills": preload("res://assets/sprites/biomes/biome_volcano/mid_hills.png"),
		"near_trees": preload("res://assets/sprites/biomes/biome_volcano/near_trees.png"),
		"ground": preload("res://assets/sprites/biomes/biome_volcano/ground.png"),
	},
	{
		"id": "starlight",
		"name": "신비의 별빛 밤하늘 & 코스믹 유적",
		"sky": preload("res://assets/sprites/biomes/biome_starlight/sky.png"),
		"far_rocks": preload("res://assets/sprites/biomes/biome_starlight/far_rocks.png"),
		"clouds": preload("res://assets/sprites/biomes/biome_starlight/clouds.png"),
		"mid_hills": preload("res://assets/sprites/biomes/biome_starlight/mid_hills.png"),
		"near_trees": preload("res://assets/sprites/biomes/biome_starlight/near_trees.png"),
		"ground": preload("res://assets/sprites/biomes/biome_starlight/ground.png"),
	},
	{
		"id": "glacier",
		"name": "신비의 황혼 성채 & 크리스탈 빙하 설원",
		"sky": preload("res://assets/sprites/biomes/biome_glacier/sky.png"),
		"far_rocks": preload("res://assets/sprites/biomes/biome_glacier/far_rocks.png"),
		"clouds": preload("res://assets/sprites/biomes/biome_glacier/clouds.png"),
		"mid_hills": preload("res://assets/sprites/biomes/biome_glacier/mid_hills.png"),
		"near_trees": preload("res://assets/sprites/biomes/biome_glacier/near_trees.png"),
		"ground": preload("res://assets/sprites/biomes/biome_glacier/ground.png"),
	}
]

func _ready() -> void:
	scroll_ignore_camera_zoom = true
	layers.clear()
	for child in get_children():
		if child is ParallaxLayer:
			layers.append(child)
			
	change_biome(0, true)

func _process(delta: float) -> void:
	var current_speed = GameState.get_current_stage_speed()
	current_scroll_x -= current_speed * delta
	
	scroll_offset.x = current_scroll_x
	scroll_base_offset.x = current_scroll_x
	GameState.scroll_x = current_scroll_x
	
	# 75초(1분 15초) 단위 실시간 다이내믹 지형/바이옴 전환 (4대 지형 순환)
	if GameState.is_game_running:
		var time_elapsed = max(0.0, 300.0 - GameState.time_left)
		var target_biome_idx = int(fmod(time_elapsed / 75.0, 4.0))
			
		if target_biome_idx != current_biome_idx and not is_transitioning:
			change_biome(target_biome_idx)

func change_biome(new_idx: int, immediate: bool = false) -> void:
	current_biome_idx = new_idx
	var biome = BIOMES[new_idx]
	
	if GameState.has_signal("biome_changed"):
		GameState.biome_changed.emit(new_idx)
	
	if immediate:
		apply_biome_textures(biome)
		return
		
	is_transitioning = true
	# 지형 전환 HUD 알림 배너
	GameState.buff_activated.emit("새로운 지형 진입!\n[%s]"% biome["name"], 3.5)
	
	# 부드러운 크로스페이드 페이드아웃 -> 텍스처 교체 -> 페이드인 애니메이션
	var tween = create_tween()
	var sprites = [sky_sprite, rocks_sprite, clouds_sprite, hills_far_sprite, hills_mid_sprite, trees_near_sprite, ground_sprite]
	for s in sprites:
		if s:
			tween.parallel().tween_property(s, "modulate:a", 0.0, 0.65)
			
	tween.tween_callback(func():
		apply_biome_textures(biome)
	)
	
	for s in sprites:
		if s:
			tween.parallel().tween_property(s, "modulate:a", 1.0, 0.85)
			
	tween.tween_callback(func():
		is_transitioning = false
	)

func apply_biome_textures(biome: Dictionary) -> void:
	if sky_sprite: sky_sprite.texture = biome["sky"]
	if rocks_sprite: rocks_sprite.texture = biome["far_rocks"]
	if clouds_sprite: clouds_sprite.texture = biome["clouds"]
	if hills_far_sprite: hills_far_sprite.texture = biome["mid_hills"]
	if hills_mid_sprite: hills_mid_sprite.texture = biome["mid_hills"]
	if trees_near_sprite: trees_near_sprite.texture = biome["near_trees"]
	if ground_sprite: ground_sprite.texture = biome["ground"]