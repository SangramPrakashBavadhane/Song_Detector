package BackEnd;

public class FFT{
     //In-place Radix-2 Cooley-Tukey Fast Fourier Transform.
     //The array size N MUST be a power of 2 (e.g. 512, 1024, 2048).

    //  @param real 
    //  @param imag

     public static void fft(double[] real,double[] imag)
     {
        int n=real.length;
        if(n!=imag.length)
        throw new IllegalArgumentException("Arrays must be of equal length.");

        if((n & (n-1)) != 0)
        throw new IllegalArgumentException("Arrays must be of equal length.");

        // 1. Bit-Reversal Permutation
        // This re-orders our input array index bits so the Cooley-Tukey combine loop works in-place
        int shift=1+Integer.numberOfLeadingZeros(n);
        for(int i=0;i<n;i++)
        {
            int j=Integer.reverse(i) >>> shift;
            if(j>i)
            {
                double tempReal=real[i];
                real[i]=real[j];
                real[j]=tempReal;

                double tempImag=imag[i];
                imag[i]=imag[j];
                imag[j]=tempImag;
            }
        }

        for(int size=2;size<=n;size*=2)
        {
            double angle= -2.0*Math.PI/size;
            double wpr=Math.cos(angle);
            double wpi=Math.sin(angle);

            for(int i=0;i<n;i+=size)
            {
                double wr=1.0;
                double wi=0.0;

                for(int j=0;j<size/2;j++)
                {
                    int k=i+j;
                    int m=k+size/2;

                    double tr=wr*real[m] -wi*imag[m];
                    double ti=wr*imag[m]+wi*real[m];

                    real[m]=real[k]-tr;
                    imag[m]=imag[k]-ti;

                    real[k]+=tr;
                    imag[k]+=ti;

                    double nextWr=wr*wpr - wi*wpi;
                    double nextWi=wr*wpi+wi*wpr;
                    wr=nextWr;
                    wi=nextWi;
                }
            }
        }


        


     }
}