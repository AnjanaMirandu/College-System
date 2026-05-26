import { useNavigate } from 'react-router-dom';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();

  const getFallbackPath = () => {
    const userType = localStorage.getItem('userType');

    if (userType === 'teacher') return '/teacher/dashboard';
    if (userType === 'admin') return '/admin/dashboard';
    if (userType === 'parent') return '/parent/dashboard';
    return '/';
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getFallbackPath());
  };

  return (
    <button className={`round-back-button ${className}`.trim()} type="button" onClick={handleBack} aria-label="Go back">
      <span className="nav-back-icon" aria-hidden="true" />
    </button>
  );
};

export default BackButton;
