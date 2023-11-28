# [bup-dockerized](https://forum.level1techs.com/t/devember-2021-dockerized-bup-backup-server/179816)

## Usage
```sh
docker run -it --rm \
  -v /place-with-stuff-to-back-up:/data:ro \
  -v /place-to-put-backups:/backups \
  -v /place-to-put-configs:/config \
  -p 8080:80 \
  arkayos/bup-dockerized
```

## WebUI

![image](https://github.com/josiah-roberts/bup-dockerized/assets/37082009/48daf7a4-ab55-4f1a-9a24-7ea3019be148)
