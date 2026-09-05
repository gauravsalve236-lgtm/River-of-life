import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class LocalAppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_app():
    print('==================================================')
    print('  River of Life Bible App - Local Server')
    print('  URL: http://localhost:' + str(PORT))
    print('  Directory: ' + DIRECTORY)
    print('==================================================')
    try:
        webbrowser.open('http://localhost:' + str(PORT) + '/index.html')
    except Exception as e:
        print('Could not automatically open browser:', e)

    try:
        with socketserver.TCPServer(('', PORT), LocalAppHandler) as httpd:
            print('Server is running on http://localhost:' + str(PORT) + ' (Press Ctrl+C to stop)...')
            httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping River of Life Bible App server. Goodbye!')
        sys.exit(0)

if __name__ == '__main__':
    start_app()
