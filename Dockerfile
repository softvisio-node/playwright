FROM softvisio/core

RUN \
    # setup node build environment
    curl -fsSL https://bitbucket.org/softvisio/scripts/raw/main/env-build-node.sh | /bin/bash -s -- setup \
    && dnf -y install google-chrome-stable \
    \
    # install deps
    && npm i --omit=dev \
    \    \
    # cleanup node build environment
    && curl -fsSL https://bitbucket.org/softvisio/scripts/raw/main/env-build-node.sh | /bin/bash -s -- cleanup \
    \
    # clean npm cache
    && rm -rf ~/.npm-cache
