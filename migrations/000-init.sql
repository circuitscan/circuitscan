CREATE TABLE IF NOT EXISTS pkg_association (
    id SERIAL PRIMARY KEY,
    chainid BIGINT NOT NULL,
    address BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pkg_name BYTEA,
    info JSONB
);

CREATE INDEX idx_pkg_association_chainid_address ON pkg_association(chainid, address);

