extends Control

signal dino_selected(stage_name: String)

@onready var close_btn: Button = $Panel/CloseBtn
@onready var cards_container: GridContainer = $Panel/VBox/Scroll/Grid
@onready var progress_label: Label = $Panel/VBox/Header/ProgressLabel

const DINO_30_INFO = [
	{
		"id": "dino_01",
		"name": "신비의 공룡알",
		"title": "[Normal] 시작의 알",
		"desc": "태고의 에너지를 품고 있는 단단한 공룡알",
		"req": "기본 제공",
		"score_req": 0,
		"mass": 0.6
	},
	{
		"id": "dino_02",
		"name": "에메랄드 벨로시",
		"title": "[Rare] 신속의 사냥꾼",
		"desc": "가볍고 빠른 발걸음과 예리한 감각을 지닌 날렵한 벨로키랍토르",
		"req": "최고 25점 달성 (첫 공룡 부화!)",
		"score_req": 25,
		"mass": 1.2
	},
	{
		"id": "dino_03",
		"name": "사파이어 트리케라",
		"title": "[Rare] 대양의 수호자",
		"desc": "청량한 푸른빛 비늘과 단단한 뿔의 트리케라",
		"req": "최고 50점 달성 (첫 도전 성공!)",
		"score_req": 50,
		"mass": 1.6
	},
	{
		"id": "dino_04",
		"name": "루비 티라노",
		"title": "[Epic] 붉은 포식자",
		"desc": "대지를 뒤흔드는 포효와 강인한 턱을 지닌 최상위 포식자 티라노",
		"req": "최고 120점 달성",
		"score_req": 120,
		"mass": 2.2
	},
	{
		"id": "dino_05",
		"name": "에메랄드 이구아노",
		"title": "[Epic] 엄지발톱 수호자",
		"desc": "날카로운 엄지 가시와 온순하면서도 강력한 힘을 지닌 초식공룡",
		"req": "최고 200점 달성",
		"score_req": 200,
		"mass": 2.6
	},
	{
		"id": "dino_06",
		"name": "토파즈 스테고",
		"title": "[Epic] 황금 골판",
		"desc": "햇살을 흡수하는 황금빛 골판의 묵직한 스테고",
		"req": "최고 300점 달성",
		"score_req": 300,
		"mass": 3.0
	},
	{
		"id": "dino_07",
		"name": "볼케이노 딜로포",
		"title": "[Legendary] 용암 분출자",
		"desc": "화염빛 볏과 날카로운 이빨로 마그마를 다루는 딜로포",
		"req": "최고 450점 달성 (중급 마스터 돌파!)",
		"score_req": 450,
		"mass": 3.6
	},
	{
		"id": "dino_08",
		"name": "글래시어 스테고케라",
		"title": "[Legendary] 절대영도 철벽",
		"desc": "단단한 골판과 서리 뿔로 빙하의 냉기를 두른 스테고케라",
		"req": "최고 600점 달성",
		"score_req": 600,
		"mass": 4.2
	},
	{
		"id": "dino_09",
		"name": "포이즌 벨로시",
		"title": "[Legendary] 맹독 사냥꾼",
		"desc": "신경독을 품은 발톱으로 그림자처럼 사냥",
		"req": "최고 800점 달성",
		"score_req": 800,
		"mass": 4.8
	},
	{
		"id": "dino_10",
		"name": "썬더 켄트로",
		"title": "[Mythic] 가시 방패의 전사",
		"desc": "어깨와 등의 날카로운 골침으로 번개의 힘을 뿜어내는 켄트로사우루스",
		"req": "최고 1,000점 달성 (1,000점 마일스톤!)",
		"score_req": 1000,
		"mass": 5.4
	},
	{
		"id": "dino_11",
		"name": "옵시디언 카르노",
		"title": "[Mythic] 칠흑의 황소룡",
		"desc": "흑요석처럼 단단한 뿔로 무엇이든 박살내는 카르노",
		"req": "최고 1,300점 달성",
		"score_req": 1300,
		"mass": 6.0
	},
	{
		"id": "dino_12",
		"name": "템페스트 파키케",
		"title": "[Mythic] 폭풍의 박치기왕",
		"desc": "돌풍을 일으키는 단단한 돔 머리로 바위도 부수는 파키케",
		"req": "최고 1,650점 달성",
		"score_req": 1650,
		"mass": 6.6
	},
	{
		"id": "dino_13",
		"name": "크리스탈 브라키오",
		"title": "[Ancient] 태고의 거신",
		"desc": "하늘을 찌를 듯한 긴 목과 웅장한 체구를 지닌 거대 브라키오사우루스",
		"req": "최고 2,050점 달성",
		"score_req": 2050,
		"mass": 7.2
	},
	{
		"id": "dino_14",
		"name": "어비스 알로",
		"title": "[Ancient] 심연의 사냥꾼",
		"desc": "붉은 볏과 날카로운 발톱으로 먹잇감을 제압하는 강인한 알로사우루스",
		"req": "최고 2,500점 달성",
		"score_req": 2500,
		"mass": 7.8
	},
	{
		"id": "dino_15",
		"name": "트와일라잇 코리토",
		"title": "[Ancient] 투구 볏의 멜로디",
		"desc": "머리의 반원형 투구 볏으로 신비로운 오로라 공명을 울리는 코리토사우루스",
		"req": "최고 3,000점 달성",
		"score_req": 3000,
		"mass": 8.4
	},
	{
		"id": "dino_16",
		"name": "블레이드 테리지노",
		"title": "[Divine] 거대 낫의 집행관",
		"desc": "70cm에 달하는 거대한 낫 발톱으로 허공을 가르는 전설의 테리지노사우루스",
		"req": "최고 3,600점 달성",
		"score_req": 3600,
		"mass": 9.0
	},
	{
		"id": "dino_17",
		"name": "크림슨 케라토",
		"title": "[Divine] 화염 뿔의 폭군",
		"desc": "코 위의 날카로운 뿔과 불타는 붉은 가죽을 지닌 흉포한 케라토사우루스",
		"req": "최고 4,300점 달성",
		"score_req": 4300,
		"mass": 10.0
	},
	{
		"id": "dino_18",
		"name": "스파이크 스티라코",
		"title": "[Divine] 가시 왕관의 돌격수",
		"desc": "목 주름 프릴에 돋아난 화려한 가시 뿔로 대지를 돌파하는 스티라코사우루스",
		"req": "최고 4,400점 달성",
		"score_req": 4400,
		"mass": 10.0
	},
	{
		"id": "dino_19",
		"name": "나이트 헌터 데이노",
		"title": "[Divine] 암습의 갈고리 발톱",
		"desc": "어둠 속을 소리 없이 질주하여 치명적인 뒷발톱으로 사냥하는 데이노니쿠스",
		"req": "최고 5,050점 달성",
		"score_req": 5050,
		"mass": 10.5
	},
	{
		"id": "dino_20",
		"name": "아쿠아 세일 스피노",
		"title": "[Divine] 수륙양용 거대 제왕",
		"desc": "등에 솟아오른 웅장한 돛과 강력한 악어 턱으로 물과 육지를 지배하는 스피노사우루스",
		"req": "최고 5,750점 달성",
		"score_req": 5750,
		"mass": 11.5
	},
	{
		"id": "dino_21",
		"name": "헬멧 크레스트 람베오",
		"title": "[Mythic] 투구 볏의 연주자",
		"desc": "머리 위의 도끼 모양 속 빈 볏으로 분수의 아름다운 화음을 연주하는 람베오사우루스",
		"req": "최고 6,500점 달성",
		"score_req": 6500,
		"mass": 12.0
	},
	{
		"id": "dino_22",
		"name": "마더 가디언 마이아",
		"title": "[Mythic] 착한 어미 수호룡",
		"desc": "둥지에서 사랑으로 알을 품어 지키며 무리의 평화를 인도하는 마이아사우라",
		"req": "최고 7,300점 달성",
		"score_req": 7300,
		"mass": 12.5
	},
	{
		"id": "dino_23",
		"name": "선셋 깃털 오비랍",
		"title": "[Mythic] 화려한 깃털 볏의 사냥꾼",
		"desc": "노을빛 깃털 볏을 펄럭이며 날렵한 몸놀림으로 평원을 누비는 오비랍토르",
		"req": "최고 8,150점 달성",
		"score_req": 8150,
		"mass": 13.0
	},
	{
		"id": "dino_24",
		"name": "골든 스프린터 갈리",
		"title": "[Mythic] 질풍의 대질주자",
		"desc": "황금빛 깃털을 휘날리며 타조보다 빠른 속도로 초원을 질주하는 갈리미무스",
		"req": "최고 9,050점 달성",
		"score_req": 9050,
		"mass": 10.5
	},
	{
		"id": "dino_25",
		"name": "쁘띠 프릴 프로토",
		"title": "[Mythic] 사막의 수호자",
		"desc": "목 주위의 둥근 뼈 프릴과 단단한 앵무새 부리로 모래바람을 뚫고 달리는 프로토케라톱스",
		"req": "최고 10,000점 달성",
		"score_req": 10000,
		"mass": 11.0
	},
	{
		"id": "dino_26",
		"name": "스파이크 아머 사우로",
		"title": "[Mythic] 철갑 가시 요새",
		"desc": "어깨와 등 전체에 돋아난 날카로운 골편 가시 갑옷으로 어떤 공격도 튕겨내는 사우로펠타",
		"req": "최고 11,000점 달성",
		"score_req": 11000,
		"mass": 12.5
	},
	{
		"id": "dino_27",
		"name": "메이스 해머 에우오",
		"title": "[Mythic] 철퇴 꼬리 전사",
		"desc": "두꺼운 골판 투구와 꼬리 끝의 거대한 뼈 곤봉으로 대지를 울리는 에우오플로케팔루스",
		"req": "최고 12,050점 달성",
		"score_req": 12050,
		"mass": 13.0
	},
	{
		"id": "dino_28",
		"name": "자이언트 브레스 아파토",
		"title": "[Mythic] 대지의 거신",
		"desc": "끝없이 뻗은 거대한 목과 채찍 같은 긴 꼬리로 대지를 흔들며 포효하는 거대한 아파토사우루스",
		"req": "최고 13,150점 달성",
		"score_req": 13150,
		"mass": 14.0
	},
	{
		"id": "dino_29",
		"name": "크로노스 시공룡",
		"title": "[Transcendent] 시공간 지배룡",
		"desc": "시간의 흐름을 조율하는 초월적 시공룡",
		"req": "최고 14,300점 달성",
		"score_req": 14300,
		"mass": 15.0
	},
	{
		"id": "dino_30",
		"name": "솔라 제네시스 신룡",
		"title": "[Transcendent] 창세의 태양신",
		"desc": "분수와 우주의 절대 진리를 깨달은 궁극의 황금 신룡",
		"req": "최고 15,500점 달성 (궁극의 태양 신룡!)",
		"score_req": 15500,
		"mass": 16.0
	}
]

var font_bold = preload("res://assets/fonts/GameFontBold.ttf")
var btn_green_tex = preload("res://assets/ui/btn_green_normal.png")
var btn_green_h_tex = preload("res://assets/ui/btn_green_hover.png")
var btn_purple_tex = preload("res://assets/ui/btn_purple_normal.png")

func _ready() -> void:
	close_btn.pressed.connect(hide)
	hide()

func _get_dino_index(dino_id: String) -> int:
	return clamp(int(dino_id.trim_prefix("dino_")), 1, 30)

func _get_effect_summary(dino_index: int) -> String:
	if dino_index <= 1:
		return "효과: 포근한 부화 파동"
	if dino_index <= 6:
		return "효과: 속성 충격파"
	if dino_index <= 12:
		return "효과: 반짝 별가루"
	if dino_index <= 18:
		return "효과: 회전 오라 + 에너지 링"
	if dino_index <= 24:
		return "효과: 광채 잔상 + 다중 슬래시"
	if dino_index <= 28:
		return "효과: 궤도광 + 연속 충격파"
	return "효과: 초월 오라 + 성운 폭발"

func open_collection() -> void:
	render_cards()
	show()

func render_cards() -> void:
	for c in cards_container.get_children():
		c.queue_free()
		
	var unlocked_count = 0
	for info in DINO_30_INFO:
		if info["id"] != "dino_01" and (UserProfile.unlocked_dinos.has(info["id"]) or UserProfile.high_score >= info["score_req"]):
			unlocked_count += 1
			
	if progress_label:
		progress_label.text = "공룡 수집: %d / 29 (%.0f%%) · 알 보유"% [unlocked_count, (float(unlocked_count)/29.0)*100.0]
		
	for info in DINO_30_INFO:
		var is_unlocked = UserProfile.unlocked_dinos.has(info["id"]) or UserProfile.high_score >= info["score_req"]
		var is_equipped = (UserProfile.selected_dino == info["id"])
		var dino_index = _get_dino_index(info["id"])
		
		var card = PanelContainer.new()
		card.custom_minimum_size = Vector2(215, 230)
		
		var card_style = StyleBoxFlat.new()
		card_style.set_corner_radius_all(14)
		if is_equipped:
			card_style.bg_color = Color(0.12, 0.28, 0.22, 0.95)
			card_style.border_color = Color(0.3, 1.0, 0.6)
			card_style.border_width_left = 2
			card_style.border_width_top = 2
			card_style.border_width_right = 2
			card_style.border_width_bottom = 2
		elif is_unlocked:
			card_style.bg_color = Color(0.1, 0.15, 0.25, 0.95)
			card_style.border_color = Color(1.0, 0.85, 0.3)
			card_style.border_width_left = 2
			card_style.border_width_top = 2
			card_style.border_width_right = 2
			card_style.border_width_bottom = 2
		else:
			card_style.bg_color = Color(0.06, 0.08, 0.12, 0.9)
			card_style.border_color = Color(0.25, 0.3, 0.4)
			card_style.border_width_left = 1
			card_style.border_width_top = 1
			card_style.border_width_right = 1
			card_style.border_width_bottom = 1
			
		card.add_theme_stylebox_override("panel", card_style)
		
		var vbox = VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 4)
		vbox.alignment = BoxContainer.ALIGNMENT_CENTER
		
		# Dino Icon Avatar
		var icon_rect = TextureRect.new()
		var icon_size = 66.0 + float(dino_index - 1) * 0.45
		icon_rect.custom_minimum_size = Vector2(icon_size, icon_size)
		icon_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		
		var icon_path = "res://assets/sprites/dinos/%s_icon.png"% info["id"]
		if not ResourceLoader.exists(icon_path):
			icon_path = "res://assets/dinos/%s.png"% info["id"]
		if ResourceLoader.exists(icon_path):
			icon_rect.texture = load(icon_path)
			
		if not is_unlocked:
			icon_rect.modulate = Color(0.25, 0.25, 0.25, 0.85)
		vbox.add_child(icon_rect)
		
		# Name Label
		var title_lbl = Label.new()
		title_lbl.text = info["name"]
		title_lbl.add_theme_font_override("font", font_bold)
		title_lbl.add_theme_font_size_override("font_size", 14)
		title_lbl.add_theme_color_override("font_color", Color(1, 0.9, 0.35) if is_unlocked else Color(0.5, 0.5, 0.5))
		title_lbl.add_theme_color_override("font_outline_color", Color.BLACK)
		title_lbl.add_theme_constant_override("outline_size", 2)
		title_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(title_lbl)
		
		# Tier / Title Label
		var sub_lbl = Label.new()
		sub_lbl.text = info["title"]
		sub_lbl.add_theme_font_override("font", font_bold)
		sub_lbl.add_theme_font_size_override("font_size", 11)
		sub_lbl.add_theme_color_override("font_color", Color(0.4, 0.9, 1.0) if is_unlocked else Color(0.4, 0.4, 0.4))
		sub_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(sub_lbl)

		# Communicate the visual reward that grows with collection rarity.
		var effect_lbl = Label.new()
		effect_lbl.text = _get_effect_summary(dino_index) if is_unlocked else "효과: 수집 후 공개"
		effect_lbl.add_theme_font_override("font", font_bold)
		effect_lbl.add_theme_font_size_override("font_size", 9)
		effect_lbl.add_theme_color_override("font_color", Color(0.85, 0.65, 1.0) if is_unlocked else Color(0.35, 0.35, 0.4))
		effect_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(effect_lbl)
		
		# Requirement / Status Label
		var status_lbl = Label.new()
		status_lbl.add_theme_font_override("font", font_bold)
		status_lbl.add_theme_font_size_override("font_size", 11)
		status_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		
		if is_unlocked:
			status_lbl.text = "수집 완료!"
			status_lbl.add_theme_color_override("font_color", Color(0.3, 1.0, 0.5))
		else:
			status_lbl.text = "[잠김] "+ info["req"]
			status_lbl.add_theme_color_override("font_color", Color(1.0, 0.45, 0.45))
		vbox.add_child(status_lbl)
		
		# Equip Button
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(170, 36)
		btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		btn.add_theme_font_override("font", font_bold)
		btn.add_theme_font_size_override("font_size", 14)
		btn.add_theme_color_override("font_outline_color", Color.BLACK)
		btn.add_theme_constant_override("outline_size", 2)
		
		if is_unlocked:
			if is_equipped:
				btn.text = "장착 중"
				btn.disabled = true
			else:
				btn.text = "장착하기"
				btn.pressed.connect(func():
					UserProfile.selected_dino = info["id"]
					UserProfile.save_data()
					GameState.evolution_changed.emit(info["id"])
					dino_selected.emit(info["id"])
					render_cards()
				)
		else:
			btn.text = "잠김 [잠김]"
			btn.disabled = true
			
		vbox.add_child(btn)
		card.add_child(vbox)
		cards_container.add_child(card)
