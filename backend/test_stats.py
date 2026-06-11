import cv2
import numpy as np

with open("test_output.txt", "w") as f:
    def check_saturation(name, r, g, b):
        pixel = np.array([[[r, g, b]]], dtype=np.uint8)
        hsv = cv2.cvtColor(pixel, cv2.COLOR_RGB2HSV)
        f.write(f"{name:20s} RGB({r:3}, {g:3}, {b:3}) -> Saturation (0-255): {hsv[0][0][1]}\n")

    f.write("--- HSV Saturation Test ---\n")
    check_saturation("Pure Gray (Road)", 128, 128, 128)
    check_saturation("Dark Gray (Asphalt)", 60, 60, 60)
    check_saturation("Brownish Mud", 139, 115, 85)
    check_saturation("Light Skin Tone", 241, 194, 125)
    check_saturation("Medium Skin Tone", 198, 134, 66)
    check_saturation("Dark Skin Tone", 61, 34, 18)
    check_saturation("Bright Yellow/Orange", 255, 200, 0)
    check_saturation("Text Page (White)", 245, 245, 245)
