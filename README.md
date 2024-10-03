Right now only one lessons done:

https://indian-textbooks-audiobook.vercel.app/class4/snowflakes/merrylegs.html

Find the live version at https://indian-textbooks-audiobook.vercel.app/

I will appreciate contributions.

This is the google colab I used to create the srts from the audio. The audio I got from eleven labs (https://elevenlabs.io/). The NCERT books are available online easily.

https://colab.research.google.com/drive/1C1JIYyYfovVtmFzCsecElR1cFkQU59Ky?usp=sharing

How to create new lessons:
1. First write out the lesson in text. Maybe use some sort of OCR method to get the text.
2. Put the text to elevenlabs.io and generate the mp3 using any voice. I'm using Lily. (since its british, closer to indian accent) Download the mp3 audio.
3. Run the above google colab script and upload the mp3 there. Run the script to generate the srt file.
4. Upload the srt file along with the audio into a new folder (it can be copy of any other page)
5. Change the paragraph array (So that the frontend knows where to seperate out the paragraphs)
   ```
   var paragraphArray = [27, 60, 122, 163, 183, 190, 205, 208, 209, 222, 268];
   // the numbers are the words afer which a paragraph break has to occur.
   ```
7. Make a few changes in the index.html page so people can navigate to it.
