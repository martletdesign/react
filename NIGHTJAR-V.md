# Nightjar V: manifest boundary parity

Real R2 sandbox validation exposed a common-contract boundary gap: the Astro/React gateway accepted otherwise valid manifests without fixture provenance, toolchain or creation metadata. Jekyll already rejected these missing fields. A valid file checksum inventory cannot replace required source/build evidence.

The gateway now validates the existing v1 contract's fixture source/optional workbench commit, Node toolchain versions and canonical ISO creation time before committing or serving a manifest. The producer/client already requires these fields; this closes a weaker direct-upload route without changing the schema, storage layout, package identities, catalog/promotion algorithm, credentials, publication gates or deployment settings.

Unit/emulator fixtures now include the producer's required metadata. Existing assertions are retained; a new regression rejects eight missing/invalid metadata cases and confirms that no snapshot becomes publicly committed. Live validation reuses the existing gateway with a test-only native S3 transport in the private `nightjar-archive-sandbox` bucket. It does not establish live Worker-runtime validation or Worker-only IAM isolation. Production gates remain closed.
