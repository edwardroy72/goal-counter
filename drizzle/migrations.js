// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_shocking_blob.sql';
import m0001 from './0001_jazzy_havok.sql';
import m0002 from './0002_breezy_measurement_goal_type.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  
