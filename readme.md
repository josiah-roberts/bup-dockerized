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

## Features
- Multi-source backups
- Exclusions
- Cron-style schedules
- Revision removal
- Restore a revision
- Exponential-backoff style pruning ([prune-older](https://bup.github.io/man/bup-prune-older.1.html))
- Various visibility tools
  - Space used
  - Last run
  - Next run

## WebUI

![image](https://github.com/josiah-roberts/bup-dockerized/assets/37082009/dc48ec9f-59ee-440c-b3f2-e45b7f2998ae)
