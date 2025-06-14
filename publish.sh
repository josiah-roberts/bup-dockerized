tag=${1:-latest}

sudo docker build --network=host --tag arkayos/bup-dockerized:$tag .
sudo docker push arkayos/bup-dockerized:$tag
