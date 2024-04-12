
CREATE TABLE IF NOT EXISTS solidity_sources (
    id SERIAL PRIMARY KEY,
    chainid BIGINT NOT NULL,
    address BYTEA NOT NULL,
    source_code TEXT
);

CREATE INDEX idx_solidity_sources_chainid_address ON solidity_sources(chainid, address);
CREATE INDEX idx_solidity_sources_address ON solidity_sources(address);

ALTER TABLE solidity_sources ADD CONSTRAINT pair_source_chain_address UNIQUE (chainid, address);





CREATE TABLE IF NOT EXISTS verified_circuit (
    id SERIAL PRIMARY KEY,
    chainid BIGINT NOT NULL,
    address BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payload JSONB
);

CREATE INDEX idx_verified_circuit_chainid_address ON verified_circuit(chainid, address);

ALTER TABLE verified_circuit ADD CONSTRAINT pair_verified_chain_address UNIQUE (chainid, address);
