import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 1500); // 1,5s de delay para visualização segura

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
      <img 
        src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
        alt="Cruz Vermelha Amares" 
        className="h-16 mb-6"
      />
      <h1 className="text-2xl font-semibold mb-2">Disponibilidade Socorristas</h1>
      <p className="text-gray-600">
        Sistema oficial da Cruz Vermelha - Delegação de Amares
      </p>
      <p className="mt-4 text-gray-500">A carregar e a redirecionar para a página de login...</p>
    </div>
  );
};

export default Index;
