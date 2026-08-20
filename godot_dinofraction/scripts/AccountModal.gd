extends Control

@onready var username_input: LineEdit = $Panel/VBox/NameBox/UsernameInput
@onready var school_input: LineEdit = $Panel/VBox/SchoolBox/SchoolInput
@onready var save_btn: Button = $Panel/VBox/BtnBox/SaveBtn
@onready var msg_label: Label = $Panel/VBox/MsgLabel
@onready var close_btn: Button = $Panel/CloseBtn

func _ready() -> void:
	save_btn.pressed.connect(_on_save_pressed)
	close_btn.pressed.connect(hide)
	hide()

func open_account() -> void:
	username_input.text = UserProfile.username if UserProfile else "용감한 공룡"
	school_input.text = UserProfile.school if UserProfile else "공룡초등학교"
	msg_label.text = ""
	show()

func _on_save_pressed() -> void:
	var new_name = username_input.text.strip_edges()
	var new_school = school_input.text.strip_edges()
	if new_name.length() > 6:
		new_name = new_name.substr(0, 6)
	if new_school.length() > 8:
		new_school = new_school.substr(0, 8)
	if new_name.length() > 0:
		if UserProfile:
			UserProfile.username = new_name
			if new_school.length() > 0:
				UserProfile.school = new_school
			UserProfile.save_data()
		msg_label.text = "프로필 정보가 성공적으로 저장되었습니다!"
		msg_label.modulate = Color.GREEN
	else:
		msg_label.text = "[주의] 올바른 닉네임을 입력해주세요 (최대 6글자)."
		msg_label.modulate = Color.RED