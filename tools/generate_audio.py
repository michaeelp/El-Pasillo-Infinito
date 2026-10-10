import array
import json
import math
import random
import sys
import wave
from pathlib import Path

root = Path(__file__).resolve().parents[1]
monsters = json.loads((root / 'monsters.json').read_text())
rate = 22050
profiles = {23: (71, 4.7, .55), 24: (735, 17, .12), 25: (183, 6, .7), 26: (267, 2.1, .22), 27: (103, 13, .6), 28: (418, 21, .35), 29: (351, 32, .48), 30: (57, 3.1, .28)}
profiles.update({31:(98,2.4,.42),32:(527,19,.25),33:(138,4.3,.63),34:(684,37,.36),35:(46,7.8,.57),36:(873,11.3,.14),37:(224,1.6,.29),38:(339,5.2,.45)})

def cue(identifier, kind):
    rng = random.Random(identifier * 7919 + (101 if kind == 'scream' else 7))
    base, pulse, roughness = profiles.get(identifier, (82 + identifier * 17, 3 + identifier % 9, .2 + identifier % 5 * .09))
    duration = (1.05 + identifier % 5 * .11) if kind == 'scream' else (.44 + identifier % 4 * .09)
    count = int(rate * duration)
    signal = []
    phase = 0
    low = 0
    for index in range(count):
        t = index / rate
        u = t / duration
        noise = rng.uniform(-1, 1)
        low = low * .86 + noise * .14
        swell = 1 + .18 * math.sin(2 * math.pi * (pulse * .27) * t)
        glide = (.72 + 1.75 * u * u) if kind == 'scream' else (1.25 - .58 * u)
        frequency = base * swell * glide
        phase += 2 * math.pi * frequency / rate
        grain = .5 + .5 * math.sin(2 * math.pi * pulse * t)
        voice = math.sin(phase) * .43 + math.sin(phase * 2.03) * .22 + math.sin(phase * 3.97) * .13
        if identifier == 23:
            voice += noise * (max(0, math.sin(2 * math.pi * 11 * t)) ** 20) * .9
        elif identifier == 24:
            voice = math.sin(phase * (1.3 + .3 * math.sin(t * 37))) * .65 + low * .1
        elif identifier == 25:
            voice = math.tanh(voice * 2.9) * .68 + noise * grain * .26
        elif identifier == 26:
            voice += math.sin(phase * .501) * .35 + low * .16
        elif identifier == 27:
            voice += noise * (max(0, math.sin(t * 91)) ** 28) * 1.2
        elif identifier == 28:
            voice = math.sin(phase * 2.77) * math.exp(-((t * 19) % 1) * 12) + voice * .4
        elif identifier == 29:
            voice = voice * .3 + noise * grain * .72
        elif identifier == 30:
            voice += math.sin(phase * .251) * .4 + low * .4 + math.sin(t * 330) * math.exp(-((t * 6) % 1) * 9) * .2
        envelope = min(1, t / .012) * min(1, (duration - t) / .09) * (.92 - .5 * u)
        signal.append((voice * (.65 + grain * .35) + low * roughness) * envelope)
    peak = max(abs(value) for value in signal)
    samples = array.array('h', (int(value / peak * 24200) for value in signal))
    if sys.byteorder != 'little':
        samples.byteswap()
    return samples.tobytes()

for monster in monsters:
    for kind, key in [('appear', 'sonidoAparicion'), ('scream', 'sonidoScreamer')]:
        target = root / monster[key]
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.tmp')
        with wave.open(str(temporary), 'wb') as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(rate)
            output.writeframes(cue(monster['id'], kind))
        temporary.replace(target)
print(f'AUDIO OK: {len(monsters) * 2} WAV originales, PCM16 mono a {rate} Hz.')
# Ambiente en bucle; frecuencias de ciclos enteros y bordes suaves, sin saturación.
rng=random.Random(501)
ambient=array.array('h')
low=0
for index in range(rate*8):
    t=index/rate
    low=low*.993+rng.uniform(-1,1)*.007
    fade=math.sin(math.pi*t/8)**2
    value=(math.sin(2*math.pi*41*t)*.08+math.sin(2*math.pi*61.75*t)*.035+low*.15)*fade
    ambient.append(int(value*18000))
if sys.byteorder!='little':
    ambient.byteswap()
with wave.open(str(root/'assets/audio/ambience.wav'),'wb') as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(ambient.tobytes())
