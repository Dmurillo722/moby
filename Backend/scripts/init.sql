CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256),
    email VARCHAR(256) NOT NULL UNIQUE,
    phone VARCHAR(256),
    password_hash VARCHAR(256) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    tier VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS asset (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(256) UNIQUE
);

CREATE TABLE IF NOT EXISTS alert (
    id SERIAL PRIMARY KEY, 
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id INT NOT NULL REFERENCES asset(id),
    alert_type VARCHAR(256) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    threshold FLOAT,
    email BOOLEAN NOT NULL,
    sms BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES asset(id),
    price FLOAT, 
    volume FLOAT,
    time TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sentiment_data (
    id SERIAL PRIMARY KEY, 
    asset_id INT NOT NULL REFERENCES asset(id),
    sentiment_rating INT NOT NULL,
    time TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_event_history (
    id SERIAL PRIMARY KEY, 
    alert_id INT NOT NULL REFERENCES alert(id) ON DELETE CASCADE,
    sent TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_asset_symbol ON asset(symbol);
CREATE INDEX idx_market_data_asset_time ON market_data(asset_id, time);
CREATE INDEX idx_alert_type ON alert(alert_type);
-- change these as we figure out what we're accessing most often