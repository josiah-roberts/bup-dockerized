sudo docker build --tag bup-dev .
sudo docker run -it --rm -v `pwd`/src:/usr/app/src -p 8080:1234 --name trying bup-dev npm run dev
