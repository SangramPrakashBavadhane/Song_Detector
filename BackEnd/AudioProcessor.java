package BackEnd;

import java.io.ByteArrayInputStream;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;

public class AudioProcessor
{
     /**
     * Reads raw WAV bytes, decodes the 16-bit PCM data,
     * and returns normalized double samples between -1.0 and 1.0.
     */

    public static double[] readWav(byte[] wavBytes) throws Exception
    {
          // 1. Wrap the byte array in an input stream so Java sound API can read it
          ByteArrayInputStream bias=new ByteArrayInputStream(wavBytes);

                  // 2. Parse the WAV headers automatically using Java's built-in AudioSystem
                  AudioInputStream ais= AudioSystem.getAudioInputStream(bias);
                  AudioFormat format=ais.getFormat();

                    // 3. Validation: Verify that it is 16-bit PCM Signed audio
        if (format.getEncoding() != AudioFormat.Encoding.PCM_SIGNED) {
            throw new IllegalArgumentException("Unsupported encoding: " + format.getEncoding());
        }
        if (format.getSampleSizeInBits() != 16) {
            throw new IllegalArgumentException("Only 16-bit audio is supported.");
        }

               // 4. Read the audio data payload (ignoring the 44-byte header, which ais already parsed)
               byte[] audioBytes = ais.readAllBytes();
               int numSamples=audioBytes.length/2; // Since 16-bit = 2 bytes per sample
               double[] samples=new double[numSamples];

               boolean isBigEndian =format.isBigEndian();

               // 5. Convert every 2 bytes into a single double value

               for(int i=0;i<numSamples;i++)
               {
                   int b1=audioBytes[i*2] & 0xFF;
                   int b2=audioBytes[i*2+1] & 0xFF;

                   int val;
                      if (isBigEndian) 
                      {
                        // Big-endian: High byte first, Low byte second
                        val = (b1 << 8) | b2;
                      } 
                      else 
                      {
                        // Little-endian (Standard WAV): Low byte first, High byte second
                        val = (b2 << 8) | b1;
                      }

                      short pcmSample=(short)val;

                      samples[i]=pcmSample/32768.0;    
            
               }

               return samples;
         
        
    }
}