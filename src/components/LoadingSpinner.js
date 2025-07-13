import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = '#2563eb', 
  text = 'Loading...', 
  showText = true,
  fullPage = false,
  backgroundColor = 'transparent'
}) => {
  // Size configurations
  const sizeConfig = {
    small: { spinner: 24, text: 14, padding: '20px 0' },
    medium: { spinner: 48, text: 16, padding: '40px 0' },
    large: { spinner: 64, text: 18, padding: '60px 0' },
    xlarge: { spinner: 80, text: 20, padding: '80px 0' }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Animation keyframes
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: config.padding,
      background: backgroundColor,
      width: fullPage ? '100vw' : '100%',
      height: fullPage ? '100vh' : 'auto',
      position: fullPage ? 'fixed' : 'relative',
      top: fullPage ? 0 : 'auto',
      left: fullPage ? 0 : 'auto',
      zIndex: fullPage ? 9999 : 'auto',
    },
    spinner: {
      width: config.spinner,
      height: config.spinner,
      border: `3px solid rgba(${hexToRgb(color)}, 0.1)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: showText ? 16 : 0,
    },
    text: {
      fontSize: config.text,
      color: color,
      fontFamily: 'Maax, sans-serif',
      fontWeight: 500,
      textAlign: 'center',
      marginTop: 8,
      opacity: 0.8,
    },
    // Pulsing dots animation
    dots: {
      display: 'inline-block',
      animation: 'pulse 1.5s ease-in-out infinite',
    }
  };

  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '37, 99, 235'; // Default blue RGB
  }

  // Inject CSS animations
  React.useEffect(() => {
    const styleId = 'loading-spinner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .loading-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={spinnerStyles.container} className="loading-fade-in">
      <div style={spinnerStyles.spinner}></div>
      {showText && (
        <div style={spinnerStyles.text}>
          {text}
          <span style={spinnerStyles.dots}>...</span>
        </div>
      )}
    </div>
  );
};

// Additional loading variants for different use cases
export const TableLoadingSpinner = ({ text = 'Loading data...' }) => (
  <LoadingSpinner 
    size="medium" 
    color="#2563eb" 
    text={text} 
    showText={true}
    backgroundColor="rgba(248, 250, 252, 0.8)"
  />
);

export const FullPageLoadingSpinner = ({ text = 'Loading...' }) => (
  <LoadingSpinner 
    size="large" 
    color="#2563eb" 
    text={text} 
    showText={true}
    fullPage={true}
    backgroundColor="rgba(255, 255, 255, 0.95)"
  />
);

export const ButtonLoadingSpinner = ({ size = 'small', color = '#ffffff' }) => (
  <LoadingSpinner 
    size={size} 
    color={color} 
    showText={false}
    backgroundColor="transparent"
  />
);

export const CardLoadingSpinner = ({ text = 'Loading...' }) => (
  <LoadingSpinner 
    size="medium" 
    color="#6b7280" 
    text={text} 
    showText={true}
    backgroundColor="transparent"
  />
);

export default LoadingSpinner;
