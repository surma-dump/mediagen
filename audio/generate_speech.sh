LINE="Center channel. Left channel. Right channel. Surround left channel. Surround right channel. Rear left channel. Rear right channel. Buffer"
say --data-format=I32@48000 -o snippets.wav $LINE

# For-loop iterating through all the silent gaps detected by ffmpeg.
# Using awk to turn them into other ffmpeg parameters to isolate the individual
# announcements.
i=1;
ffmpeg -i "snippets.wav" -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1 | \
  awk 'BEGIN {se=0;} /silence_start:/ { printf "-ss %s -t %s\n", se, ($5-se) } /silence_end:/ {se=$5} ' | \
  while read line; do
    filename=$(echo $LINE | cut -d. -f $i | xargs)
    i=$(expr $i + 1)
    ffmpeg \
      -y -nostdin \
      $line \
      -i snippets.wav \
      "$filename.wav"
  done;

rm snippets.wav

# Generate 40Hz wave for LFE
ffmpeg -nostdin -y -f lavfi -i "sine=frequency=40:duration=5:sample_rate=48000" -c:a pcm_s16le "Subwoofer channel.wav"

# Pad audio files to > 5s
ls *.wav | while read line; do
  ffmpeg \
    -y -nostdin \
    -i "$line" \
    -filter_complex 'aevalsrc=0:d=5[silence];[0:a][silence]concat=n=2:v=0:a=1[out]' -map '[out]' \
    "Padded $line"
done 

# Assemble 5.1 audio
ffmpeg \
  -y -nostdin \
  -i "Padded Left channel.wav" \
  -i "Padded Right channel.wav" \
  -i "Padded Center channel.wav" \
  -i "Subwoofer channel.wav" \
  -i "Padded Rear left channel.wav" \
  -i "Padded Rear right channel.wav" \
  -filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a]amerge=inputs=6[aout]" -map "[aout]" single_51.wav

# Repeat a few times
cat > list.txt << EOF
file single_51.wav
file single_51.wav
file single_51.wav
file single_51.wav
file single_51.wav
file single_51.wav
EOF

ffmpeg \
  -y -nostdin \
  -f concat -i list.txt \
  "51.wav"

rm list.txt *channel.wav single_51.wav Padded*.wav

for codec in "-c:a libfdk_aac -b:a 384k" "-c:a ac3 -b:a 640k" "-c:a dca -b:a 1536k"; do
  name=$(echo $codec | awk '{print $2}')
  echo $codec $name
  ffmpeg \
    -y -nostdin \
    -i 51.wav \
    -strict -2 \
    -c:v null $codec \
    "${name}_51.mp4"
done