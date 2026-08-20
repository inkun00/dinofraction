class_name FractionView
extends HBoxContainer

static func create_fraction(whole: int, num: int, den: int, font_size: int = 24, font_color: Color = Color.WHITE, is_in_bubble: bool = false) -> Control:
	var root = HBoxContainer.new()
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_theme_constant_override("separation", 3 if is_in_bubble else 6)
	
	var shadow_col = Color(0, 0, 0, 0.9)
	var outline_col = Color(0, 0, 0, 0.95)
	
	if num == 0:
		var whole_lbl = Label.new()
		whole_lbl.text = str(whole)
		whole_lbl.add_theme_font_size_override("font_size", font_size + (4 if is_in_bubble else 6))
		whole_lbl.add_theme_color_override("font_color", font_color)
		if is_in_bubble:
			whole_lbl.add_theme_color_override("font_outline_color", outline_col)
			whole_lbl.add_theme_constant_override("outline_size", 3)
			whole_lbl.add_theme_color_override("font_shadow_color", shadow_col)
			whole_lbl.add_theme_constant_override("shadow_offset_y", 1)
		whole_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		root.add_child(whole_lbl)
		return root
		
	if whole > 0:
		var whole_lbl = Label.new()
		whole_lbl.text = str(whole)
		whole_lbl.add_theme_font_size_override("font_size", font_size + (4 if is_in_bubble else 6))
		whole_lbl.add_theme_color_override("font_color", font_color)
		if is_in_bubble:
			whole_lbl.add_theme_color_override("font_outline_color", outline_col)
			whole_lbl.add_theme_constant_override("outline_size", 3)
			whole_lbl.add_theme_color_override("font_shadow_color", shadow_col)
			whole_lbl.add_theme_constant_override("shadow_offset_y", 1)
		whole_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		root.add_child(whole_lbl)
		
	# Fraction vertical stack (Numerator / Horizontal Line / Denominator)
	var v_box = VBoxContainer.new()
	v_box.alignment = BoxContainer.ALIGNMENT_CENTER
	v_box.add_theme_constant_override("separation", 0 if is_in_bubble else 1)
	
	var num_lbl = Label.new()
	num_lbl.text = str(num)
	num_lbl.add_theme_font_size_override("font_size", int(font_size * 0.95))
	num_lbl.add_theme_color_override("font_color", font_color)
	if is_in_bubble:
		num_lbl.add_theme_color_override("font_outline_color", outline_col)
		num_lbl.add_theme_constant_override("outline_size", 3)
		num_lbl.add_theme_color_override("font_shadow_color", shadow_col)
		num_lbl.add_theme_constant_override("shadow_offset_y", 1)
	num_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v_box.add_child(num_lbl)
	
	var line = ColorRect.new()
	line.color = font_color
	var line_w = max(14 if is_in_bubble else 20, max(len(str(num)), len(str(den))) * (11 if is_in_bubble else 15))
	line.custom_minimum_size = Vector2(line_w, 2.0 if is_in_bubble else 2.5)
	line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v_box.add_child(line)
	
	var den_lbl = Label.new()
	den_lbl.text = str(den)
	den_lbl.add_theme_font_size_override("font_size", int(font_size * 0.95))
	den_lbl.add_theme_color_override("font_color", font_color)
	if is_in_bubble:
		den_lbl.add_theme_color_override("font_outline_color", outline_col)
		den_lbl.add_theme_constant_override("outline_size", 3)
		den_lbl.add_theme_color_override("font_shadow_color", shadow_col)
		den_lbl.add_theme_constant_override("shadow_offset_y", 1)
	den_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v_box.add_child(den_lbl)
	
	root.add_child(v_box)
	return root

static func create_operator(op: String, font_size: int = 24, font_color: Color = Color.WHITE) -> Control:
	var lbl = Label.new()
	lbl.text = ""+ op + ""
	lbl.add_theme_font_size_override("font_size", font_size + 4)
	lbl.add_theme_color_override("font_color", font_color)
	lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return lbl