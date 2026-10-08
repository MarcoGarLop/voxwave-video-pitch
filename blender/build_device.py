"""
VoxWave rural device — procedural model for Blender 5.x.

Builds a simple, student-made prototype: white 3D-printed case (hollow base + lid). On the lid,
front to back: a small coral arcade button, the microphone and a small OLED screen for alerts.
Inside the base: a Raspberry Pi on standoffs, a perfboard and jumper wires. USB-C port on the right
side, and a USB-C cable plugged into the back that runs down into a grommet on the turntable.
Saves blender/device.blend.

Hierarchy (animated by render_shots.py):
  Turntable (rotates) -> Device (drops in) -> base parts + Lid (drops in) -> lid parts + Screw rigs
  Turntable -> Cable Rig (cable, plug, grommet)

Usage (from the repo root):
  blender -b --python blender/build_device.py -- --preview <out_dir>
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(ROOT, "textures")

# ---------------------------------------------------------------- dimensions (meters)
W, D = 0.105, 0.125
CORNER_R = 0.010
WALL = 0.003
FEET = 0.0025
BASE_H = 0.036
GAP = 0.0005
LID_H = 0.016
BASE_Z0 = FEET
BASE_TOP = BASE_Z0 + BASE_H
FLOOR_Z = BASE_Z0 + 0.0025
LID_Z0 = BASE_TOP + GAP
TOP = LID_Z0 + LID_H

# Lid layout, front (-Y) to back (+Y): button, microphone, screen.
BUTTON_XY = (0.0, -0.036)
BUTTON_TOP = TOP + 0.011
MIC_XY = (0.0, 0.0)
SCREEN_XY = (0.0, 0.034)
SCREEN_Z = TOP + 0.0021
LED_XY = (0.034, 0.034)
SCREWS = [(sx * (W / 2 - 0.009), sy * (D / 2 - 0.009)) for sx in (-1, 1) for sy in (-1, 1)]

# Ports (USB-C): right side wall, and back wall with the cable plugged in.
PORT_Z = FLOOR_Z + 0.0033
SIDE_PORT = (W / 2, -0.024, PORT_Z)
BACK_PORT = (-0.022, D / 2, PORT_Z)
PLATFORM_R = 0.105


def srgb(hex_color):
    """Hex sRGB -> linear RGBA, so brand colors match in Blender."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


CORAL = srgb("#FF6E42")
TEAL_BRIGHT = srgb("#2F9BCB")


# ---------------------------------------------------------------- scene reset
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


# ---------------------------------------------------------------- materials
def principled(name, color, rough=0.5, metal=0.0, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    for k, v in extra.items():
        bsdf.inputs[k].default_value = v
    return m


def pla_material(name, color):
    """Matte PLA with faint horizontal layer lines (bump from a banded wave texture)."""
    m = principled(name, color, rough=0.52, **{"Subsurface Weight": 0.04})
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = 520  # ~0.6 mm layer pitch
    wave.inputs["Distortion"].default_value = 0.0
    wave.inputs["Detail"].default_value = 0.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.00015
    nt.links.new(coord.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def screen_material(name, image_names, strength=2.2):
    """Glossy black glass with emissive screen content. Several images can be mixed via 'screen_mix' (0..n-1)."""
    m = principled(name, (0.0, 0.0, 0.0, 1.0), rough=0.12)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    uv = nt.nodes.new("ShaderNodeTexCoord")
    texs = []
    for img_name in image_names:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(os.path.join(TEX, img_name))
        tex.interpolation = "Closest"
        nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
        texs.append(tex)
    color_out = texs[0].outputs["Color"]
    # Chain of mix nodes: screen_mix value k selects image k.
    for i in range(1, len(texs)):
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.name = f"screen_mix_{i}"
        mix.inputs["Factor"].default_value = 0.0
        nt.links.new(color_out, mix.inputs["A"])
        nt.links.new(texs[i].outputs["Color"], mix.inputs["B"])
        color_out = mix.outputs["Result"]
    nt.links.new(color_out, bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = strength
    return m


def decal_material(name, image_name):
    m = principled(name, (1, 1, 1, 1), rough=0.45)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(TEX, image_name))
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    return m


# ---------------------------------------------------------------- geometry helpers
def link(obj, parent=None):
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    return link(obj, parent)


def mesh_obj(name, bm, mat, parent, smooth=False):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    obj = bpy.data.objects.new(name, me)
    obj.data.materials.append(mat)
    return link(obj, parent)


def add_bevel(obj, width, segments=4):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    return obj


def box(name, size, center, mat, parent, bevel=0.0, segments=6):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0] + center[0], v.co.y * size[1] + center[1], v.co.z * size[2] + center[2]))
    obj = mesh_obj(name, bm, mat, parent, smooth=bevel > 0)
    if bevel > 0:
        add_bevel(obj, bevel, segments)
    return obj


def cylinder(name, radius, depth, center, mat, parent, segments=48, bevel=0.0, axis="Z"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=depth)
    for v in bm.verts:
        x, y, z = v.co
        if axis == "Y":
            x, y, z = x, z, y
        elif axis == "X":
            x, y, z = z, y, x
        v.co = Vector((x + center[0], y + center[1], z + center[2]))
    obj = mesh_obj(name, bm, mat, parent, smooth=True)
    if bevel > 0:
        add_bevel(obj, bevel, 5)
    return obj


def plane(name, size, center, mat, parent, facing="-Y"):
    """Rectangle with UVs 0..1. facing: '-Y' (front), '+Y' (back) or '+Z' (top, image top towards +Y)."""
    sx, sy = size[0] / 2, size[1] / 2
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new()
    if facing == "-Y":
        corners = [(-sx, 0, -sy), (sx, 0, -sy), (sx, 0, sy), (-sx, 0, sy)]
    elif facing == "+Y":
        corners = [(sx, 0, -sy), (-sx, 0, -sy), (-sx, 0, sy), (sx, 0, sy)]
    else:
        corners = [(-sx, -sy, 0), (sx, -sy, 0), (sx, sy, 0), (-sx, sy, 0)]
    verts = [bm.verts.new((c[0] + center[0], c[1] + center[1], c[2] + center[2])) for c in corners]
    face = bm.faces.new(verts)
    for loop, uv in zip(face.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop[uv_layer].uv = uv
    return mesh_obj(name, bm, mat, parent)


def rrect(w, d, r, n=10):
    """Counter-clockwise outline of a rounded rectangle centered at the origin."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, -(d / 2 - r), -90), (w / 2 - r, d / 2 - r, 0), (-(w / 2 - r), d / 2 - r, 90), (-(w / 2 - r), -(d / 2 - r), 180)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _side_faces(bm, low, high):
    n = len(low)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((low[i], low[j], high[j], high[i]))


def prism(name, outline, z0, z1, mat, parent, bevel=0.0):
    """Solid extruded outline (smooth walls, flat caps)."""
    bm = bmesh.new()
    low = [bm.verts.new((x, y, z0)) for x, y in outline]
    high = [bm.verts.new((x, y, z1)) for x, y in outline]
    bm.faces.new(list(reversed(low)))
    _side_faces(bm, low, high)
    bm.faces.new(high)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_obj(name, bm, mat, parent)
    for p in obj.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.5
    if bevel > 0:
        add_bevel(obj, bevel)
    return obj


def shell(name, outer, inner, z0, z1, zf, mat, parent, bevel=0.0):
    """Open box: outer walls z0..z1, rim at z1, inner walls down to a floor at zf."""
    bm = bmesh.new()
    o0 = [bm.verts.new((x, y, z0)) for x, y in outer]
    o1 = [bm.verts.new((x, y, z1)) for x, y in outer]
    i1 = [bm.verts.new((x, y, z1)) for x, y in inner]
    i0 = [bm.verts.new((x, y, zf)) for x, y in inner]
    bm.faces.new(list(reversed(o0)))
    _side_faces(bm, o0, o1)
    _side_faces(bm, o1, i1)
    _side_faces(bm, i1, i0)
    bm.faces.new(i0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = mesh_obj(name, bm, mat, parent)
    for p in obj.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.5
    if bevel > 0:
        add_bevel(obj, bevel)
    return obj


def wire(name, points, radius, mat, parent):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    obj.data.materials.append(mat)
    return link(obj, parent)


def usb_c_port(name, center, axis, parent, mats):
    """USB-C receptacle seen through the wall: rounded silver shell, black slot and a tongue."""
    sx = 0.0006 if axis == "X" else 0.0094
    sy = 0.0094 if axis == "X" else 0.0006
    sign = 1 if (center[0] if axis == "X" else center[1]) > 0 else -1
    off = (sign * 0.0002, 0, 0) if axis == "X" else (0, sign * 0.0002, 0)
    box(f"{name} Shell", (sx, sy, 0.0036), center, mats["silver"], parent, bevel=0.0016, segments=6)
    c2 = tuple(c + o for c, o in zip(center, off))
    box(f"{name} Slot", (sx * 0.9 if axis == "X" else 0.0082, sy * 0.9 if axis == "Y" else 0.0082, 0.0026), c2, mats["black"], parent, bevel=0.0011, segments=6)
    c3 = tuple(c + 2 * o for c, o in zip(center, off))
    box(f"{name} Tongue", (sx * 0.5 if axis == "X" else 0.0058, sy * 0.5 if axis == "Y" else 0.0058, 0.0007), c3, mats["silver"], parent)


# ---------------------------------------------------------------- build
def build():
    reset()
    scene = bpy.context.scene

    turntable = empty("Turntable")
    device = empty("Device", turntable)
    lid = empty("Lid", device)
    cable_rig = empty("Cable Rig", turntable)

    white = pla_material("PLA White", (0.80, 0.80, 0.775, 1))
    grey_plastic = principled("Plastic Grey", (0.33, 0.34, 0.35, 1), rough=0.45)
    coral = principled("Button Coral", CORAL, rough=0.4, **{"Coat Weight": 0.08, "Coat Roughness": 0.3})
    black = principled("Black", (0.008, 0.008, 0.008, 1), rough=0.6)
    rubber = principled("Rubber", (0.02, 0.02, 0.022, 1), rough=0.75)
    metal = principled("Screw Metal", (0.62, 0.62, 0.62, 1), rough=0.32, metal=1.0)
    brass = principled("Brass", (0.75, 0.55, 0.25, 1), rough=0.35, metal=1.0)
    gold = principled("Gold Pins", (0.85, 0.65, 0.3, 1), rough=0.3, metal=1.0)
    silver = principled("Port Silver", (0.8, 0.8, 0.82, 1), rough=0.25, metal=1.0)
    mesh_grey = principled("Mic Mesh", (0.18, 0.19, 0.2, 1), rough=0.4, metal=0.6)
    pcb_blue = principled("PCB Blue", (0.005, 0.04, 0.2, 1), rough=0.35)
    pcb_green = principled("PCB Green", (0.01, 0.18, 0.04, 1), rough=0.35)
    perf = principled("Perfboard", (0.45, 0.28, 0.08, 1), rough=0.5)
    chip = principled("Chip Black", (0.015, 0.015, 0.017, 1), rough=0.35)
    led = principled("Status LED", CORAL, rough=0.2, **{"Emission Color": CORAL, "Emission Strength": 8.0})
    screen = screen_material("OLED Screen", ["screen-ready.png", "screen-listening.png", "screen-alert.png"])
    decal = decal_material("Logo Decal", "logo-decal.png")
    mats = {"silver": silver, "black": black}

    # ---- Base: hollow 3D-printed tub
    outer = rrect(W, D, CORNER_R)
    inner = rrect(W - 2 * WALL, D - 2 * WALL, CORNER_R - WALL)
    shell("Case Base", outer, inner, BASE_Z0, BASE_TOP, FLOOR_Z, white, device, bevel=0.0012)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder("Foot", 0.006, FEET, (sx * (W / 2 - 0.015), sy * (D / 2 - 0.015), FEET / 2), rubber, device)

    # Screw bosses in the corners, with the threaded hole on top
    for cx, cy in SCREWS:
        cylinder("Screw Boss", 0.0036, BASE_TOP - 0.0008 - FLOOR_Z, (cx, cy, (FLOOR_Z + BASE_TOP - 0.0008) / 2), white, device, segments=32)
        cylinder("Boss Hole", 0.0014, 0.0004, (cx, cy, BASE_TOP - 0.0006), black, device, segments=20)

    # Printed logo on the front of the base
    plane("Logo Decal", (0.045, 0.027), (0.0, -D / 2 - 0.00005, BASE_Z0 + BASE_H / 2), decal, device, facing="-Y")

    # ---- Inside: Raspberry Pi on brass standoffs (long side along X, towards the back)
    pi_c = (-0.006, 0.022)
    pi_z = FLOOR_Z + 0.005
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder("Standoff", 0.0022, 0.005, (pi_c[0] + sx * 0.0385, pi_c[1] + sy * 0.0245, FLOOR_Z + 0.0025), brass, device, segments=6)
    box("Pi PCB", (0.085, 0.056, 0.0016), (pi_c[0], pi_c[1], pi_z + 0.0008), pcb_green, device, bevel=0.0015, segments=3)
    pz = pi_z + 0.0016
    box("Pi SoC", (0.015, 0.015, 0.0013), (pi_c[0] - 0.012, pi_c[1] - 0.002, pz + 0.00065), silver, device, bevel=0.0005, segments=2)
    box("Pi RAM", (0.011, 0.014, 0.0011), (pi_c[0] + 0.006, pi_c[1] - 0.002, pz + 0.00055), chip, device)
    box("Pi Chip", (0.006, 0.006, 0.0009), (pi_c[0] - 0.030, pi_c[1] - 0.012, pz + 0.00045), chip, device)
    box("Pi Chip", (0.008, 0.005, 0.0009), (pi_c[0] + 0.010, pi_c[1] - 0.019, pz + 0.00045), chip, device)
    # USB / Ethernet stacks on the short edge
    for i, (dy, h, w_) in enumerate(((0.0185, 0.0135, 0.016), (0.0005, 0.016, 0.0145), (-0.0175, 0.016, 0.0145))):
        box("Pi Port Stack", (0.017, w_, h), (pi_c[0] + 0.0385, pi_c[1] + dy, pz + h / 2), silver, device, bevel=0.0005, segments=2)
    # GPIO header: black strip + 2x20 gold pins along the back edge
    gy = pi_c[1] + 0.0245
    box("GPIO Header", (0.051, 0.005, 0.0025), (pi_c[0] - 0.004, gy, pz + 0.00125), chip, device)
    for k in range(20):
        for r in (-1, 1):
            box("GPIO Pin", (0.00064, 0.00064, 0.0058), (pi_c[0] - 0.004 - 0.0241 + k * 0.00254, gy + r * 0.00127, pz + 0.0029), gold, device)

    # Perfboard with the mic preamp and button wiring, front-left of the floor
    pb = (-0.022, -0.034)
    box("Perfboard", (0.034, 0.024, 0.0016), (pb[0], pb[1], FLOOR_Z + 0.004), perf, device)
    box("Preamp Chip", (0.008, 0.006, 0.002), (pb[0] - 0.006, pb[1] + 0.002, FLOOR_Z + 0.0058), chip, device)
    cylinder("Capacitor", 0.0025, 0.006, (pb[0] + 0.008, pb[1] + 0.004, FLOOR_Z + 0.0078), pcb_blue, device, segments=20)
    box("Terminal", (0.010, 0.006, 0.006), (pb[0] + 0.006, pb[1] - 0.006, FLOOR_Z + 0.0078), principled("Terminal Blue", (0.02, 0.12, 0.45, 1), rough=0.4), device)
    for sx in (-1, 1):
        cylinder("Standoff", 0.0018, 0.0032, (pb[0] + sx * 0.014, pb[1], FLOOR_Z + 0.0016), brass, device, segments=6)

    # Jumper wires from the GPIO header to the perfboard
    colors = [(0.6, 0.02, 0.02, 1), (0.01, 0.01, 0.01, 1), (0.75, 0.6, 0.02, 1), (0.02, 0.15, 0.55, 1), (0.85, 0.85, 0.85, 1)]
    for i, col in enumerate(colors):
        m = principled(f"Wire {i}", col, rough=0.45)
        x0 = pi_c[0] - 0.026 + i * 0.00254 * 2
        pts = [
            (x0, gy, pz + 0.006),
            (x0 - 0.004, gy - 0.004, pz + 0.020 + i * 0.0015),
            (pb[0] + 0.004 + i * 0.002, pb[1] + 0.03, pz + 0.017 + i * 0.001),
            (pb[0] - 0.010 + i * 0.004, pb[1] + 0.004, FLOOR_Z + 0.0065),
        ]
        wire(f"Jumper {i}", pts, 0.0007, m, device)

    # USB-C ports: side (empty) and back (the cable plugs in here), each on a small breakout board
    usb_c_port("Side USB-C", (SIDE_PORT[0] + 0.0001, SIDE_PORT[1], SIDE_PORT[2]), "X", device, mats)
    box("Side Breakout", (0.012, 0.014, 0.0016), (W / 2 - WALL - 0.006, SIDE_PORT[1], FLOOR_Z + 0.0008), pcb_blue, device)
    usb_c_port("Back USB-C", (BACK_PORT[0], BACK_PORT[1] + 0.0001, BACK_PORT[2]), "Y", device, mats)
    box("Back Breakout", (0.014, 0.012, 0.0016), (BACK_PORT[0], D / 2 - WALL - 0.006, FLOOR_Z + 0.0008), pcb_blue, device)
    wire("Power Lead", [(BACK_PORT[0], D / 2 - WALL - 0.008, FLOOR_Z + 0.0025), (BACK_PORT[0] + 0.004, 0.040, FLOOR_Z + 0.004), (pi_c[0] + 0.012, pi_c[1] - 0.030, pz + 0.002)], 0.0012, rubber, device)

    # ---- Lid (parented to the Lid empty so it can drop in as one piece)
    lid_outline = rrect(W, D, CORNER_R)
    prism("Case Lid", lid_outline, LID_Z0, TOP, white, lid, bevel=0.0028)

    # Small arcade button: grey bezel + coral cap (front)
    bx, by = BUTTON_XY
    cylinder("Button Bezel", 0.0155, 0.0036, (bx, by, TOP + 0.0018), grey_plastic, lid, segments=64, bevel=0.0011)
    cylinder("Button Cap", 0.0118, 0.008, (bx, by, TOP + 0.0036 + 0.003), coral, lid, segments=64, bevel=0.0028)

    # Microphone grille (middle)
    mx, my = MIC_XY
    cylinder("Mic Ring", 0.0115, 0.0012, (mx, my, TOP + 0.0006), grey_plastic, lid, segments=64, bevel=0.0004)
    cylinder("Mic Mesh", 0.0094, 0.0006, (mx, my, TOP + 0.0012), mesh_grey, lid, segments=64)
    pitch = 0.0026
    for row in range(-4, 5):
        for col in range(-4, 5):
            hx = (col + (row % 2) * 0.5) * pitch
            hy = row * pitch * 0.866
            if math.hypot(hx, hy) < 0.0080:
                cylinder("Mic Hole", 0.0008, 0.0002, (mx + hx, my + hy, TOP + 0.00155), black, lid, segments=12)

    # OLED module lying on the lid (back): blue PCB, brass screws, black panel, glass
    ox, oy = SCREEN_XY
    box("OLED PCB", (0.050, 0.029, 0.0016), (ox, oy, TOP + 0.0008), pcb_blue, lid, bevel=0.0006, segments=2)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder("OLED Screw", 0.0014, 0.0008, (ox + sx * 0.0215, oy + sy * 0.0115, TOP + 0.002), brass, lid, segments=20)
    box("OLED Panel", (0.042, 0.022, 0.0012), (ox, oy - 0.0006, TOP + 0.0022), black, lid)
    plane("OLED Glass", (0.038, 0.019), (ox, oy - 0.0006, SCREEN_Z + 0.0008), screen, lid, facing="+Z")

    # Status LED next to the screen
    cylinder("LED Ring", 0.0026, 0.0006, (LED_XY[0], LED_XY[1], TOP + 0.0003), grey_plastic, lid, segments=32)
    cylinder("LED", 0.0018, 0.0012, (LED_XY[0], LED_XY[1], TOP + 0.0008), led, lid, segments=32, bevel=0.0006)

    # Screw holes + M3 screws, each on its own rig so it can be driven in
    for i, (cx, cy) in enumerate(SCREWS):
        cylinder("Screw Hole", 0.0031, 0.0003, (cx, cy, TOP + 0.00005), black, lid, segments=32)
        rig = empty(f"Screw Rig {i}", lid, (cx, cy, TOP))
        cylinder("Screw Head", 0.0029, 0.0007, (0, 0, 0.00035), metal, rig, segments=32, bevel=0.0003)
        box("Screw Slot", (0.0042, 0.0007, 0.0003), (0, 0, 0.0007), black, rig)
        box("Screw Slot", (0.0007, 0.0042, 0.0003), (0, 0, 0.0007), black, rig)
        cylinder("Screw Shaft", 0.0014, 0.012, (0, 0, -0.006), metal, rig, segments=16)

    # ---- Cable: USB-C plug in the back port, cable down onto the turntable and into a grommet
    px, py, pz_ = BACK_PORT
    plug = empty("Plug Rig", cable_rig)
    box("USB-C Plug", (0.011, 0.016, 0.0062), (px, py + 0.0085, pz_), rubber, plug, bevel=0.0018, segments=4)
    box("USB-C Ferrule", (0.0083, 0.003, 0.0026), (px, py + 0.0005, pz_), silver, plug, bevel=0.001, segments=4)
    gx, gy_ = 0.034, 0.090
    pts = [
        (px, py + 0.016, pz_),
        (px, py + 0.024, pz_ - 0.001),
        (px + 0.006, py + 0.032, 0.0022),
        (px + 0.026, py + 0.036, 0.0019),
        (gx - 0.004, gy_ + 0.001, 0.0019),
        (gx, gy_, -0.003),
    ]
    wire("Cable", pts, 0.0019, rubber, cable_rig)
    cylinder("Grommet Ring", 0.0078, 0.0012, (gx, gy_, 0.0006), grey_plastic, cable_rig, segments=48, bevel=0.0004)
    cylinder("Grommet Hole", 0.0054, 0.0004, (gx, gy_, 0.0013), black, cable_rig, segments=48)

    # Floors that only catch shadows; film is transparent so Remotion supplies the background.
    floor = box("Shadow Catcher", (6, 6, 0.001), (0, 0, -0.0005), white, None)
    floor.is_shadow_catcher = True
    disc = cylinder("Platform Catcher", PLATFORM_R, 0.001, (0, 0, -0.0005), white, None, segments=128)
    disc.is_shadow_catcher = True
    disc.hide_render = True

    setup_world_and_lights(scene)
    setup_render(scene)
    return device


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def area_light(name, location, target, size, power, color=(1, 1, 1)):
    data = bpy.data.lights.new(name, "AREA")
    data.size = size
    data.energy = power
    data.color = color
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    look_at(obj, target)
    return link(obj)


def setup_world_and_lights(scene):
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.012, 0.016, 0.02, 1)
    bg.inputs["Strength"].default_value = 1.0
    scene.world = world

    target = (0, 0, 0.03)
    area_light("Key", (-0.45, -0.5, 0.6), target, 0.7, 7, (1.0, 0.97, 0.93))
    area_light("Fill", (0.6, -0.35, 0.22), target, 1.0, 2.0, (0.92, 0.96, 1.0))
    area_light("Rim Teal", (0.35, 0.6, 0.35), target, 0.5, 6, TEAL_BRIGHT[:3])
    area_light("Kicker Coral", (-0.55, 0.45, 0.12), target, 0.4, 1.5, CORAL[:3])


def setup_render(scene):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = backend
            break
        except TypeError:
            continue
    try:
        prefs.refresh_devices()
    except AttributeError:
        prefs.get_devices()
    gpu_found = False
    for dev in prefs.devices:
        dev.use = dev.type != "CPU"
        gpu_found = gpu_found or dev.use
    scene.cycles.device = "GPU" if gpu_found else "CPU"
    print(f"[device] compute={prefs.compute_device_type} gpu={gpu_found}")

    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    for vt in ("Khronos PBR Neutral", "AgX"):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    print(f"[device] view transform = {scene.view_settings.view_transform}")


def add_camera(name, location, target, lens=70, dof=False, fstop=4.0):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.clip_start = 0.01
    if dof:
        data.dof.use_dof = True
        data.dof.focus_distance = (Vector(location) - Vector(target)).length
        data.dof.aperture_fstop = fstop
    cam = bpy.data.objects.new(name, data)
    cam.location = location
    look_at(cam, target)
    return link(cam)


def render_previews(out_dir):
    """Design review stills: closed hero, open (lid lifted), top layout and back with the cable."""
    scene = bpy.context.scene
    os.makedirs(out_dir, exist_ok=True)
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.cycles.samples = 64
    bpy.data.objects["Turntable"].rotation_euler = (0, 0, math.radians(-30))
    lid = bpy.data.objects["Lid"]
    shots = {
        "hero": (add_camera("Cam Hero", (0.0, -0.56, 0.40), (0, 0, 0.03), lens=70), 0.0),
        "open": (add_camera("Cam Open", (0.0, -0.50, 0.46), (0, 0, 0.03), lens=62), 0.075),
        "top": (add_camera("Cam Top", (0.0, -0.20, 0.42), (0, 0.0, 0.05), lens=70), 0.0),
        "back": (add_camera("Cam Back", (0.36, 0.40, 0.22), (0, 0.02, 0.02), lens=60), 0.0),
    }
    for name, (cam, lift) in shots.items():
        lid.location = (0, 0, lift)
        scene.camera = cam
        scene.render.filepath = os.path.join(out_dir, f"device-{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[device] rendered {name}")
    lid.location = (0, 0, 0)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    build()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "device.blend"))
    if "--preview" in argv:
        render_previews(argv[argv.index("--preview") + 1])
