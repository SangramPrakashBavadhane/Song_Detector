package BackEnd;

import java.util.ArrayList;
import java.util.List;

public class Fingerprinter
{
    //size of sliding FFT window (must be power of 2)
    private static final int WINDOW_SIZE=2048;
    //step size for sliding (75%)
    private static final int STEP_SIZE=512;

    //Define 4 Key frequency bands(indices representing frequency ranges)
    //At 44.1KHz sample rate,each FFT bin is roughly 21.5Hz (44100/2048)
    private static final int [] BANDS={30,40,80,120,180};
      // Band 1: 30-40 (645Hz - 860Hz)
    // Band 2: 40-80 (860Hz - 1720Hz)
    // Band 3: 80-120 (1720Hz - 2580Hz)
    // Band 4: 120-180 (2580Hz - 3870Hz)
    // This are the sweet spot for teh music , below it are freq of air and more

    public static class Keypoint
    {
        public final long hash;
        public final int timeFrame;

        public Keypoint(long hash,int timeFrame)
        {
            this.hash=hash;
            this.timeFrame=timeFrame;
        }

        public static List<keypoint> fingerprint(double[] samples)
        {
            List<Keypoint> keypoints=new ArrayList<>();
            int numSamples=(int) samples.length;
            
            //slide the window across the audio data
            int frameCount=0;
            for(int offset=0;offset+WINDOW_SIZE <= numSamples;offset+=STEP_SIZE)
            {
                            // 1. Copy the current audio window into real array, initialize imag to 0.0
                            double[] real=new double[WINDOW_SIZE];
                            double[] imag=new double[WINDOW_SIZE];
                            System.arraycopy(samples,offset,real,0,WINDOW_SIZE);
                            
                            
            // 2. Perform the FFT to convert this window to the Frequency Domain
            FFT.fft(real,img);
            //finding loudest peaks

            int []peaks=new int[4];

            for(int band=0;band<4;band++)
            {
                int startBin=BANDS[band];
                int endBin=BANDS[band+1];

                double maxMagnitude= -1.0;
                int peakBin=startBin;

                for(int bin=startBin;bin<endBin;bin++)
                {|
                    double magnitude=(real[bin]*real[bin])+(img[bin]*img[bin]);
                    if(magnitude > maxMagnitude)
                    {
                        maxMagnitude=magnitude;
                        peakBin=bin;
                    }
                }
                peaks[band]=peakBin;

            }

            
            // 4. Combine the 4 peak indices into a single unique long integer hash
            // We use bitwise shifting to pack four 8-bit integers into one 64-bit long

            long hash = ((long) peaks[0]) | 
                        ((long) peaks[1] << 8) | 
                        ((long) peaks[2] << 16) | 
                        ((long) peaks[3] << 24);

                          // 5. Store the fingerprint along with its relative time position
            keypoints.add(new Keypoint(hash, frameCount));
            frameCount++



            }

            return keypoints;



            
        }
    }



}