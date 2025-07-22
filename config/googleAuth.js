/*const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../model/userModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but was originally created with email/password
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // If user doesn't exist, create new user
        const username =
          profile.displayName.replace(/\s+/g, "").toLowerCase() +
          Math.random().toString(36).slice(-4);

        user = new User({
          username,
          email: profile.emails[0].value,
          password: "GOOGLE_AUTH_" + Math.random().toString(36).slice(-8), // Random password for Google users
          googleId: profile.id,
          isVerified: true, // Google users are automatically verified
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
*/
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../model/userModel");
const logger = require("../utils/logger"); // ✅ Winston logger

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            logger.info(`Google ID added to existing user: ${email}`);
          } else {
            logger.info(`Google login for existing user: ${email}`);
          }

          return done(null, user);
        }

        // New user
        const username =
          profile.displayName.replace(/\s+/g, "").toLowerCase() +
          Math.random().toString(36).slice(-4);

        user = new User({
          username,
          email,
          password: "GOOGLE_AUTH_" + Math.random().toString(36).slice(-8),
          googleId: profile.id,
          isVerified: true,
        });

        await user.save();
        logger.info(`New Google user created: ${email}`);

        return done(null, user);
      } catch (error) {
        logger.error("Google auth error", { error: error.message });
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    logger.error("Deserialize user failed", { error: error.message });
    done(error, null);
  }
});

module.exports = passport;
