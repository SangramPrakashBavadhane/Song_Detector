package BackEnd;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;

public class Server{
    private static final int PORT=8080;

    public static void main(String[] args) throws IOException
    {
        HttpServer server=HttpServer.create(new InetSocketAddress(PORT),0);
        server.createContext("/api/identify",new IdentifyHandler());
        System.out.println("Java Shazam Server started on port"+ PORT);
        server.start();
    }

    static class IdentifyHandler implements HttpHandler
    {
        @Override
        public void handle(HttpExchange exchange) throws IOException{
            //1.CORS Headers
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin","*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods","POST,OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers","Content-Type");

            if(exchange.getRequestMethod().equals("OPTIONS"))
            {
                exchange.sendResponseHeaders(204,-1);
                return;
            }

            if(!exchange.getRequestMethod().equals("POST"))
            {
                exchange.sendResponseHeaders(405,-1);
                return;
            }

            System.out.println("Received an identification request from client...");

             // 3. Read raw WAV bytes directly from the request body stream
            byte[] wavBytes = exchange.getRequestBody().readAllBytes();
            System.out.println("Successfully received " + wavBytes.length + " bytes of WAV audio data.");

            // 4. Return the mock JSON response to test connection
            String jsonResponse = "{\"title\":\"Bohemian Rhapsody (Java Direct Byte Test)\",\"artist\":\"Queen\",\"score\":100,\"offset\":0.0}";
             

               exchange.getResponseHeaders().set("Content-Type", "application/json");
               byte[] responseBytes=jsonResponse.getBytes("UTF-8");
               exchange.sendResponseHeaders(200,responseBytes.length);

               try(OutputStream os=exchange.getResponseBody())
               {
                os.write(responseBytes);
               }

        }
    }



}

