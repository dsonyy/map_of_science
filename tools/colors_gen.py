import colorsys


def generate_colors(N, S=0.75, L=0.5):
    colors = []
    for i in range(N):
        H = (i / N) * 360
        # Konwersja HSL (H/360, S, L) na RGB
        rgb = colorsys.hls_to_rgb(H / 360, L, S)
        # Konwersja wartości z przedziału [0, 1] do [0, 255]
        rgb = tuple(round(x, 4) for x in rgb)
        colors.append(rgb)
    return colors


# Przykładowe użycie
N = 11  # liczba kolorów do wygenerowania
colors = generate_colors(N)

# Wyświetlanie wygenerowanych kolorów
for idx, color in enumerate(colors):
    print(f"{color[0]}, {color[1]}, {color[2]}")
