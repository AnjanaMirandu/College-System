const requireUserType = (allowedType) => (req, res, next) => {
  if (req.user?.type !== allowedType) {
    return res.status(403).json({ message: 'This area is only available to parent accounts.' });
  }

  return next();
};

module.exports = requireUserType;
