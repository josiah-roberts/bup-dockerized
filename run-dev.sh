sudo docker build --tag bup-dev .
sudo docker run -it --rm -v `pwd`/src:/usr/app/src -p 8080:1234 --name bup-dev-watch bup-dev npm run dev
