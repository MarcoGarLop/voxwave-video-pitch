"""
Animated shots of the VoxWave device for the pitch video.

Usage (from the repo root):
  blender -b --python blender/render_shots.py -- turntable [--test]
  blender -b --python blender/render_shots.py -- closeup [--test]
Writes RGBA PNG sequences to public/device/<shot>/.
"""
import math
import os
import sys

import json

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_device as dev  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30

# Local (Device space) points tracked for the Remotion hand-offs.
BUTTON_LOCAL = Vector((dev.BUTTON_XY[0], dev.BUTTON_XY[1], dev.BUTTON_TOP))
SCREEN_LOCAL = Vector((dev.SCREEN_XY[0], dev.SCREEN_XY[1] - 0.0006, dev.SCREEN_Z + 0.0008))

# Assembly beats of the turntable (frames). Remotion mirrors these for its sound effects.
ASSEMBLY = {
    "drop_from": 8,
    "land": 22,
    "lid_from": 30,
    "lid_land": 46,
    "screws_visible": 50,
    "screw_starts": [54, 60, 66, 72],
    "screw_len": 10,
    "cable_from": 74,
    "cable_to": 90,
    "plug_from": 88,
    "plug_click": 92,
}


def hide(name_prefix):
    for obj in bpy.data.objects:
        if obj.name.startswith(name_prefix):
            obj.hide_render = True


def key_hidden(obj, frame_visible):
    """Hidden until frame_visible (including all children)."""
    for o in [obj, *obj.children_recursive]:
        o.hide_render = True
        o.keyframe_insert("hide_render", frame=frame_visible - 1)
        o.hide_render = False
        o.keyframe_insert("hide_render", frame=frame_visible)


def set_interp(obj, interp="BEZIER", easing="AUTO"):
    for fc in _fcurves(obj):
        for kp in fc.keyframe_points:
            kp.interpolation = interp
            kp.easing = easing


def _fcurves(idblock):
    action = idblock.animation_data.action if idblock.animation_data else None
    if action is None:
        return []
    curves = []
    if hasattr(action, "fcurves"):
        curves = list(action.fcurves)
    if not curves and hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    curves.extend(bag.fcurves)
    return curves


def key_z(obj, keys):
    """keys: list of (frame, z, interpolation, easing) — interpolation applies from that key to the next."""
    for f, z, _, _ in keys:
        obj.location.z = z
        obj.keyframe_insert("location", index=2, frame=f)
    for fc in _fcurves(obj):
        if fc.data_path == "location" and fc.array_index == 2:
            for kp, (_, _, interp, easing) in zip(fc.keyframe_points, keys):
                kp.interpolation = interp
                kp.easing = easing


def turntable_angles(frames, start_deg=-35.0, slow=0.22, ramp=(70, 125)):
    """Slow turn while the device is assembled, then it speeds up; one full turn in total."""
    def shape(f):
        u = min(1.0, max(0.0, (f - ramp[0]) / (ramp[1] - ramp[0])))
        return u * u * (3 - 2 * u)

    # speed(f) = slow + (fast - slow) * shape(f); choose fast so the turn adds up to 360°.
    base = sum(slow for _ in range(frames))
    weight = sum(shape(f) for f in range(frames))
    fast = slow + (360.0 - base) / weight
    angles, a = [], start_deg
    for f in range(frames):
        angles.append(a)
        a += slow + (fast - slow) * shape(f)
    return angles


def turntable(test=False, meta_only=False):
    """Scene 6: the open base drops onto the platform, the lid lands and is screwed in, the cable is
    plugged in, all while the device turns slowly; then it spins up to complete one full turn."""
    scene = bpy.context.scene
    table = bpy.data.objects["Turntable"]
    device = bpy.data.objects["Device"]
    lid = bpy.data.objects["Lid"]
    hide("Shadow Catcher")
    bpy.data.objects["Platform Catcher"].hide_render = False

    # Brighter rim so the white case separates from the dark navy stage (a touch less teal than before).
    bpy.data.objects["Rim Teal"].data.energy = 7
    bpy.data.objects["Key"].data.energy = 8

    frames = 7 * FPS
    scene.frame_start = 0
    scene.frame_end = frames - 1
    scene.render.fps = FPS
    A = ASSEMBLY

    for f, ang in enumerate(turntable_angles(frames)):
        table.rotation_euler = (0, 0, math.radians(ang))
        table.keyframe_insert("rotation_euler", index=2, frame=f)
    set_interp(table, "LINEAR")

    # Base falls in from above with a small bounce.
    key_z(device, [
        (0, 0.30, "CONSTANT", "AUTO"),
        (A["drop_from"], 0.30, "QUAD", "EASE_IN"),
        (A["land"], 0.0, "QUAD", "EASE_OUT"),
        (A["land"] + 4, 0.005, "QUAD", "EASE_IN"),
        (A["land"] + 8, 0.0, "LINEAR", "AUTO"),
    ])
    # Lid drops onto the base.
    key_z(lid, [
        (0, 0.30, "CONSTANT", "AUTO"),
        (A["lid_from"], 0.30, "QUAD", "EASE_IN"),
        (A["lid_land"], 0.0, "QUAD", "EASE_OUT"),
        (A["lid_land"] + 3, 0.0025, "QUAD", "EASE_IN"),
        (A["lid_land"] + 6, 0.0, "LINEAR", "AUTO"),
    ])
    # Screws appear above their holes and are driven in, in a cross pattern.
    order = [0, 3, 1, 2]
    for k, i in enumerate(order):
        rig = bpy.data.objects[f"Screw Rig {i}"]
        key_hidden(rig, A["screws_visible"])
        s0 = A["screw_starts"][k]
        s1 = s0 + A["screw_len"]
        key_z(rig, [
            (0, rig.location.z + 0.010, "CONSTANT", "AUTO"),
            (s0, rig.location.z + 0.010, "SINE", "EASE_IN_OUT"),
            (s1, rig.location.z, "LINEAR", "AUTO"),
        ])
        rig.rotation_euler = (0, 0, 0)
        rig.keyframe_insert("rotation_euler", index=2, frame=s0)
        rig.rotation_euler = (0, 0, -math.radians(4 * 360))
        rig.keyframe_insert("rotation_euler", index=2, frame=s1)
        for fc in _fcurves(rig):
            if fc.data_path == "rotation_euler":
                for kp in fc.keyframe_points:
                    kp.interpolation = "SINE"
                    kp.easing = "EASE_IN_OUT"

    # Cable draws itself from the grommet up to the back port, then the plug clicks in.
    cable = bpy.data.objects["Cable"]
    curve = cable.data
    curve.bevel_factor_mapping_start = "SPLINE"
    curve.bevel_factor_start = 1.0
    curve.keyframe_insert("bevel_factor_start", frame=A["cable_from"])
    curve.bevel_factor_start = 0.0
    curve.keyframe_insert("bevel_factor_start", frame=A["cable_to"])
    for fc in _fcurves(curve):
        for kp in fc.keyframe_points:
            kp.interpolation = "SINE"
            kp.easing = "EASE_OUT"
    key_hidden(cable, A["cable_from"] + 1)
    for name in ("Grommet Ring", "Grommet Hole"):
        key_hidden(bpy.data.objects[name], A["cable_from"] - 3)
    plug = bpy.data.objects["Plug Rig"]
    key_hidden(plug, A["plug_from"])
    plug.location.y = 0.006
    plug.keyframe_insert("location", index=1, frame=A["plug_from"])
    plug.location.y = 0.0
    plug.keyframe_insert("location", index=1, frame=A["plug_click"])

    cam = dev.add_camera("Cam Turntable", (0.0, -0.56, 0.40), (0, 0, 0.03), lens=62)
    scene.camera = cam
    scene.cycles.samples = 16 if test else 32
    # Rendered at the size it is shown in the video, so no resampling in Remotion.
    scene.render.resolution_x = 1536
    scene.render.resolution_y = 864
    scene.render.use_persistent_data = True
    out = os.path.join(REPO, "public", "device", "turntable")
    os.makedirs(out, exist_ok=True)
    scene.render.filepath = os.path.join(out, "frame_")
    write_floor_meta(scene, cam, out, radius=dev.PLATFORM_R)
    write_button_track(scene, cam, device, out, frames)
    if meta_only:
        return
    if test:
        for f in (16, 24, 40, 60, 84, 92, 150):
            scene.frame_set(f)
            scene.render.filepath = os.path.join(out, f"test_{f:03d}.png")
            bpy.ops.render.render(write_still=True)
    else:
        bpy.ops.render.render(animation=True)


def write_button_track(scene, cam, device, out, frames):
    """Screen position of the coral button top for every frame of the turn (exit zoom/wipe in Remotion)."""
    w, h = scene.render.resolution_x, scene.render.resolution_y
    track = []
    for f in range(frames):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        v = world_to_camera_view(scene, cam, device.matrix_world @ BUTTON_LOCAL)
        track.append([round(v.x * w, 1), round((1 - v.y) * h, 1)])
    path = os.path.join(out, "meta.json")
    with open(path) as f:
        meta = json.load(f)
    meta["button"] = track
    meta["assembly"] = ASSEMBLY
    with open(path, "w") as f:
        json.dump(meta, f)
    print("[shots] button track", track[0], track[-1])


def write_floor_meta(scene, cam, out, radius):
    """Screen-space position of the floor contact point and of a floor circle around it (for Remotion overlays)."""
    bpy.context.view_layer.update()
    w, h = scene.render.resolution_x, scene.render.resolution_y

    def px(p):
        v = world_to_camera_view(scene, cam, Vector(p))
        return [round(v.x * w, 1), round((1 - v.y) * h, 1)]

    meta = {
        "width": w,
        "height": h,
        "center": px((0, 0, 0)),
        "left": px((-radius, 0, 0)),
        "right": px((radius, 0, 0)),
        "front": px((0, -radius, 0)),
        "back": px((0, radius, 0)),
        "radius": radius,
    }
    with open(os.path.join(out, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("[shots] floor meta", meta)


def closeup(test=False):
    """Scene 7: cinematic close-up on paper. Button press, camera glides over the lid to the screen,
    which switches to the alert."""
    scene = bpy.context.scene
    frames = 7 * FPS
    scene.frame_start = 0
    scene.frame_end = frames - 1
    scene.render.fps = FPS
    scene.cycles.samples = 16 if test else 24
    scene.cycles.adaptive_threshold = 0.03
    scene.render.use_persistent_data = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    device = bpy.data.objects["Device"]
    device.rotation_euler = (0, 0, math.radians(-12))

    # Neutral light on paper: no teal/coral casts on the white case.
    rim = bpy.data.objects["Rim Teal"].data
    rim.color = (1.0, 0.98, 0.95)
    rim.energy = 5
    bpy.data.objects["Kicker Coral"].data.energy = 0
    bpy.data.objects["Fill"].data.energy = 3

    # Beats (frames) synced to the voice-over of scene 7.
    PRESS = 21          # "One button"
    SCREEN_LISTEN = 27
    ARRIVE = 125
    ALERT = 132         # "it tells them..."

    # Button press
    cap = bpy.data.objects["Button Cap"]
    for f, dz in ((PRESS - 1, 0.0), (PRESS + 2, -0.0026), (PRESS + 7, -0.0026), (PRESS + 12, 0.0)):
        cap.location = (0, 0, dz)
        cap.keyframe_insert("location", index=2, frame=f)

    # Screen content: ready -> listening -> alert
    nodes = bpy.data.materials["OLED Screen"].node_tree.nodes
    for name, f in (("screen_mix_1", SCREEN_LISTEN), ("screen_mix_2", ALERT)):
        sock = nodes[name].inputs["Factor"]
        sock.default_value = 0.0
        sock.keyframe_insert("default_value", frame=f - 1)
        sock.default_value = 1.0
        sock.keyframe_insert("default_value", frame=f)

    # Status LED blinks once the alert is on screen
    led = bpy.data.materials["Status LED"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    for k in range(6):
        f = ALERT + k * 10
        led.default_value = 14.0 if k % 2 == 0 else 1.0
        led.keyframe_insert("default_value", frame=f)

    # Camera on a path of keyframes, aimed at a moving target that also drives the focus.
    target = bpy.data.objects.new("Cam Target", None)
    bpy.context.scene.collection.objects.link(target)
    data = bpy.data.cameras.new("Cam Close")
    data.lens = 58
    data.shift_x = -0.17  # subject sits in the right third; text lives on the left
    data.clip_start = 0.01
    data.dof.use_dof = True
    data.dof.focus_object = target
    data.dof.aperture_fstop = 5.6
    cam = bpy.data.objects.new("Cam Close", data)
    bpy.context.scene.collection.objects.link(cam)
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    scene.camera = cam

    # Aim points in device space, transformed by the device rotation.
    bpy.context.view_layer.update()
    button = Vector(device.matrix_world @ (BUTTON_LOCAL - Vector((0, 0, 0.004))))
    screen = Vector(device.matrix_world @ SCREEN_LOCAL)
    keys = [
        (0, button + Vector((-0.143, -0.204, 0.146)), button),
        (55, button + Vector((-0.118, -0.239, 0.126)), button),
        (ARRIVE, screen + Vector((0.03, -0.12, 0.17)), screen),
        (frames - 1, screen + Vector((0.026, -0.10, 0.15)), screen),
    ]
    for f, loc, tgt in keys:
        cam.location = loc
        cam.keyframe_insert("location", frame=f)
        target.location = tgt
        target.keyframe_insert("location", frame=f)

    out = os.path.join(REPO, "public", "device", "closeup")
    os.makedirs(out, exist_ok=True)

    # Screen-space position of the OLED (last frame) and of the button (first frame), for Remotion hand-offs.
    def project(frame, p):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        v = world_to_camera_view(scene, cam, Vector(p))
        return [round(v.x * scene.render.resolution_x, 1), round((1 - v.y) * scene.render.resolution_y, 1)]

    button_top = Vector(device.matrix_world @ BUTTON_LOCAL)
    meta = {"width": scene.render.resolution_x, "height": scene.render.resolution_y, "buttonStart": project(0, button_top), "screenEnd": project(frames - 1, screen)}
    with open(os.path.join(out, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print("[shots] closeup meta", meta)

    if test:
        for f in (0, 30, 90, 150, 209):
            scene.frame_set(f)
            scene.render.filepath = os.path.join(out, f"test_{f:03d}.png")
            bpy.ops.render.render(write_still=True)
    else:
        scene.render.filepath = os.path.join(out, "frame_")
        bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    dev.build()
    shot = argv[0] if argv else "turntable"
    test = "--test" in argv
    if shot == "turntable":
        turntable(test)
    elif shot == "closeup":
        closeup(test)
    elif shot == "turntable-meta":
        turntable(meta_only=True)
