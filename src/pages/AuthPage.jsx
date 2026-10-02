import CardFrame from '../components/layout/CardFrame'
import AuthForm from '../components/auth/AuthForm'

export default function AuthPage() {
  return (
    <CardFrame>
      <AuthForm initialMode="login" />
    </CardFrame>
  )
}
