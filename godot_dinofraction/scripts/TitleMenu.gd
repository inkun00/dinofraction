extends Control

signal start_game_pressed()
signal open_dashboard_pressed()
signal open_leaderboard_pressed()
signal open_review_pressed()
signal open_collection_pressed()
signal open_account_pressed()

@onready var emblem_sprite: Sprite2D = $CenterContainer/VBox/LogoBox/EmblemSprite
@onready var greeting_label: RichTextLabel = $CenterContainer/VBox/GreetingLabel

# Buttons
@onready var btn_start: Button = $CenterContainer/VBox/MenuButtons/BtnStart
@onready var btn_dash: Button = $CenterContainer/VBox/MenuButtons/SubGrid/BtnDash
@onready var btn_leaderboard: Button = $CenterContainer/VBox/MenuButtons/SubGrid/BtnLeaderboard
@onready var btn_review: Button = $CenterContainer/VBox/MenuButtons/SubGrid/BtnReview
@onready var btn_col: Button = $CenterContainer/VBox/MenuButtons/SubGrid/BtnCol
@onready var btn_acc: Button = $CenterContainer/VBox/MenuButtons/SubGrid/BtnAcc

var float_timer: float = 0.0

func _ready() -> void:
	btn_start.pressed.connect(func():
		hide()
		start_game_pressed.emit()
	)
	btn_dash.pressed.connect(func(): open_dashboard_pressed.emit())
	btn_leaderboard.pressed.connect(func(): open_leaderboard_pressed.emit())
	btn_review.pressed.connect(func(): open_review_pressed.emit())
	btn_col.pressed.connect(func(): open_collection_pressed.emit())
	btn_acc.pressed.connect(func(): open_account_pressed.emit())
	
	# Hover Animations for all buttons
	var buttons = [btn_start, btn_dash, btn_leaderboard, btn_review, btn_col, btn_acc]
	for btn in buttons:
		btn.mouse_entered.connect(func():
			var tween = create_tween()
			tween.tween_property(btn, "scale", Vector2(1.05, 1.05), 0.1)
		)
		btn.mouse_exited.connect(func():
			var tween = create_tween()
			tween.tween_property(btn, "scale", Vector2(1.0, 1.0), 0.1)
		)
		btn.pivot_offset = btn.custom_minimum_size / 2.0
		
	update_view()

func _process(delta: float) -> void:
	if visible:
		float_timer += delta
		if emblem_sprite:
			emblem_sprite.position.y = 80.0 + sin(float_timer * 2.8) * 5.0
			emblem_sprite.scale = Vector2.ONE * (0.85 + sin(float_timer * 3.2) * 0.02)

func show_title() -> void:
	update_view()
	show()

func update_view() -> void:
	var uname = UserProfile.username if UserProfile else "용감한 공룡"
	var hscore = UserProfile.high_score if UserProfile else 0
	var un_count = UserProfile.unlocked_dinos.size() if UserProfile else 2
	
	greeting_label.text = "[center]🦖 [b]%s[/b] 탐험가님 | 🏆 최고기록: [color=#FFD700][b]%d Pts[/b][/color] | 🦕 수집 공룡: [color=#00E5FF][b]%d/30[/b][/color][/center]" % [uname, hscore, un_count]
