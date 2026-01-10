import { useState, useEffect } from 'react';
import { User } from '../types';
import { checkModelAccess, checkProcessingStatus } from '../lib/modelAccess';

export function useModelRestrictions(user: User, modelVersion: string, variant: string) {
  const [hasAccess, setHasAccess] = useState(true);
  const [accessMessage, setAccessMessage] = useState('');
  const [hasProcessing, setHasProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRestrictions = async () => {
      setIsChecking(true);

      const accessResult = await checkModelAccess(user, modelVersion, variant);
      setHasAccess(accessResult.hasAccess);
      if (accessResult.message) setAccessMessage(accessResult.message);

      const processingResult = await checkProcessingStatus(user);
      setHasProcessing(processingResult.hasProcessing);
      if (processingResult.message) setProcessingMessage(processingResult.message);

      setIsChecking(false);
    };

    checkRestrictions();
  }, [user, modelVersion, variant]);

  const recheckProcessing = async () => {
    const processingResult = await checkProcessingStatus(user);
    setHasProcessing(processingResult.hasProcessing);
    if (processingResult.message) setProcessingMessage(processingResult.message);
    return processingResult;
  };

  return {
    hasAccess,
    accessMessage,
    hasProcessing,
    processingMessage,
    isChecking,
    recheckProcessing,
    canGenerate: hasAccess && !hasProcessing,
  };
}
