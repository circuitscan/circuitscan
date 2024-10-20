
export default function Wizard({ currentStep, steps }) {
  return(<>
    <ul className={`
      flex
    `}>
      {steps.map((step, index) => <li key={index} className={`
        border-t-8 border-solid flex-1 rounded-sm p-1
        ${index <= currentStep ? 'border-blue-500' : 'border-gray-300'}
      `}>
        {step.title}
      </li>)}
    </ul>
    {steps.map((step, index) => <div key={index} className={`
      ${index === currentStep ? '' : 'hidden'}
    `}>{step.children}</div>)}
  </>);
}
