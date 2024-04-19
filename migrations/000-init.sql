
CREATE TABLE IF NOT EXISTS solidity_sources (
    id SERIAL PRIMARY KEY,
    chainid BIGINT NOT NULL,
    address BYTEA NOT NULL,
    source_code JSONB
);

CREATE INDEX idx_solidity_sources_chainid_address ON solidity_sources(chainid, address);
CREATE INDEX idx_solidity_sources_address ON solidity_sources(address);

ALTER TABLE solidity_sources ADD CONSTRAINT pair_source_chain_address UNIQUE (chainid, address);





CREATE TABLE IF NOT EXISTS verified_circuit (
    id SERIAL PRIMARY KEY,
    chainid BIGINT NOT NULL,
    address BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    circuit_hash BYTEA,
    payload JSONB
);

CREATE INDEX idx_verified_circuit_chainid_address ON verified_circuit(chainid, address);

ALTER TABLE verified_circuit ADD CONSTRAINT pair_verified_chain_address UNIQUE (chainid, address);





CREATE TABLE IF NOT EXISTS circom_provers (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    circuit_hash BYTEA UNIQUE,
    wasm BYTEA,
    pkey BYTEA
);

CREATE INDEX idx_circom_provers_circuit_hash ON circom_provers(circuit_hash);
