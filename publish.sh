tag=${1:-latest}

sudo docker build --tag arkayos/bup-dockerized:$tag .
sudo docker push arkayos/bup-dockerized:$tag
