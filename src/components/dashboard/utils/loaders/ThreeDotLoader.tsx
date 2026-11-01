const ThreeDotLoader = ({ color = 'currentColor', className = 'pt-1.5' }) => {
  return (
    <svg
      className={className}
      width="20"
      height="10"
      viewBox="0 0 120 30"
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
    >
      <circle cx="15" cy="15" r="15">
        <animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite" begin="0.1" />
      </circle>
      <circle cx="60" cy="15" r="15">
        <animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite" begin="0.2" />
      </circle>
      <circle cx="105" cy="15" r="15">
        <animate attributeName="opacity" dur="1s" values="0;1;0" repeatCount="indefinite" begin="0.3" />
      </circle>
    </svg>
  );
};

export default ThreeDotLoader;
