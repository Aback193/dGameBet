FROM ghcr.io/foundry-rs/foundry:v1.0.0

WORKDIR /app

RUN mkdir -p /app/out /app/cache /app/lib && chown -R foundry:foundry /app

USER foundry

ENTRYPOINT []

COPY --chown=foundry:foundry foundry.toml .
COPY --chown=foundry:foundry src/ src/
COPY --chown=foundry:foundry test/ test/
COPY --chown=foundry:foundry script/ script/

RUN forge install OpenZeppelin/openzeppelin-contracts --no-git

CMD ["forge", "build"]
