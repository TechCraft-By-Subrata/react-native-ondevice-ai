import React, {useEffect, useRef, useState} from 'react';
import {Button, SafeAreaView, ScrollView, Text, TextInput} from 'react-native';
import {
  generateText,
  generateTextStream,
  getLiteRTLMRuntimeInfo,
  resetConversation,
  unloadModel,
  type GemmaGenerationStream,
} from '@tcbs/react-native-ondevice-ai';

export default function App() {
  const [prompt, setPrompt] = useState('Explain on-device AI in one paragraph.');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Checking runtime…');
  const activeStream = useRef<GemmaGenerationStream | null>(null);

  useEffect(() => {
    getLiteRTLMRuntimeInfo()
      .then(info => setStatus(`LiteRT-LM ${info.engineVersion}; loaded: ${info.modelLoaded}`))
      .catch(error => setStatus(String(error)));
    return () => {
      void activeStream.current?.cancel();
    };
  }, []);

  const runOnce = async () => {
    setOutput('');
    try {
      const result = await generateText(prompt, {backend: 'cpu', maxTokens: 256});
      setOutput(result.text);
    } catch (error) {
      setOutput(String(error));
    }
  };

  const runStreaming = async () => {
    setOutput('');
    try {
      const stream = generateTextStream(
        prompt,
        chunk => setOutput(previous => previous + chunk.text),
        {backend: 'cpu', maxTokens: 256},
      );
      activeStream.current = stream;
      await stream.result;
    } catch (error) {
      setOutput(String(error));
    } finally {
      activeStream.current = null;
    }
  };

  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={{gap: 12, padding: 20}}>
        <Text>{status}</Text>
        <TextInput multiline value={prompt} onChangeText={setPrompt} />
        <Button title="Generate" onPress={() => void runOnce()} />
        <Button title="Stream" onPress={() => void runStreaming()} />
        <Button title="Cancel" onPress={() => void activeStream.current?.cancel()} />
        <Button title="New conversation" onPress={() => void resetConversation()} />
        <Button title="Unload model" onPress={() => void unloadModel()} />
        <Text selectable>{output}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
