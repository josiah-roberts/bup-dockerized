mkdir -p `pwd`/bup-dev-dir
mkdir -p `pwd`/bup-dev-config

docker build --tag bup-dev .
docker run -it --rm \
  -v `pwd`:/data:ro \
  -e BACKUPS_DIR=/backups \
  -v `pwd`/bup-dev-dir:/backups \
  -e CONFIG_DIR=/system-config \
  -v `pwd`/bup-dev-config:/system-config \
  -v `pwd`/src:/usr/app/src \
  -p 8080:80 \
  --user $(id -u):$(id -g) \
  --name bup-dev-watch \
  bup-dev npm run dev
