import React, {useEffect,useState} from "react";
import axios from "axios";
import { BrowserRouter as Router,Route,Link,Switch,useHistory } from "react-router-dom";
import { useFormik } from 'formik';
import { useCookies } from "react-cookie";

const RegisterAdmin =()=>{
    const [adminUsers, setAdminUsers]=useState([]);
    const [msg, setMessage]=useState('');
    const history = useHistory();

    useEffect(()=>{
        axios.get('http://127.0.0.1:8080/getadmin')
        .then(res=>{
            setAdminUsers(res.data);
        })
    },[]);

    const formik=useFormik({
        initialValues:{
            UserId:"",
            FirstName:"",
            LastName:"",
            Password:""

        },
        onSubmit:values=>{
            axios.post('http://127.0.0.1:8080/adminregister',values);
            alert('Register Successfully..');
            history.push('/adminlogin');
        }
    })
    function VerifyUserId(e){
        for(var user of adminUsers)
        {
            if(user.UserId===e.target.value){
                setMessage('User Name Taken : Try Another');
                break;
            }else{
                setMessage('User Name Available');
            }
        }
    }
    return(
        <div className="w-50">
            <form onSubmit={formik.handleSubmit}>
                <h3>Admin Register</h3>
                <dl>
                    <dt>User Id</dt>
                    <dd>
                        <input type="text" onKeyUp={VerifyUserId} onChange={formik.handleChange} name="UserId" value={formik.values.UserId}/>

                    </dd>
                    <dd>{msg}</dd>
                    <dt>First Name</dt>
                    <dd>
                        <input type="text" onChange={formik.handleChange} name="FirstName" value={formik.values.FirstName}/>
                    </dd>
                    <dt>LastName</dt>
                    <dd>
                        <input type="text" onChange={formik.handleChange} name="LastName" value={formik.values.LastName}/>
                    </dd>
                    <dt>Password</dt>
                    <dd><input type="password" onChange={formik.handleChange} name="Password" value={formik.values.Password}/>
                    </dd>
                </dl>
                <button className="btn btn-primary">Register</button>
                <div className="mt-2">
                    Existing User<Link to="/adminlogin" className="btn btn-link">Login</Link>
                </div>
            </form>
        </div>
    )
}
const LoginComponent=()=>{
    const [users, setUsers]=useState([]);
    const [msg, setMsg]=useState('');
    const [userdetails, setUserDetails]=useState({UserId:",Password:"})
    const history= useHistory();
    const [Cookies,setCookie]=useCookies(['userid']);

    useEffect(()=>{
        axios.get('http://127.0.0.1:8080/getadmin')
        .then(res=>{
            setUsers(res.data);
        })
    },[]);

    function handleUserId(e){
        setUserDetails({
            UserId: e.target.value,
            Password: userdetails.Password
        })
    }

    function handlePassword(e){
        setUserDetails({
            UserId: userdetails.UserId,
            Password: e.target.value

        })
    }

    function handleLogin(){
        for(var user of users)
        {
            if(user.UserId==userdetails.UserId && user.Password==userdetails.Password){
                setCookie('userid',userdetails.UserId, {path:'/'})
                history.push('/admindashboard');
            }
            else{
                setMsg('Invalid Credentials-Try Again');
            }
        }
    }
    return(
        <div className="w-50">
            <h2>Admin Login</h2>
            <dl>
                <dt>User Id</dt>
                    <dd><input type="text" onChange={handleUserId}/></dd>
                    <dt>Password</dt>
                    <dd><input type="password" onChange={handlePassword}/></dd>

            </dl>
            <button onClick={handleLogin}>Login</button>
            <h3>{msg}</h3>
            <div>
                New User ? <link to="/adminregister">Register</link>
            </div>
        </div>
    )
}

const AdminDashBoard=()=>{
    const [cookies,removeCookie]=useCookies(['userid']);
    const [setUserName] = useState('');
    const history=useHistory();

    useEffect(()=>{
        if(cookies.userid==undefined){
            history.push('/adminlogin');
        }
        else{
            setUserName(cookies.userid);
        }
    },);

    function handleLogout(){
        removeCookie('userid');
        history.push('/adminlogin');
    }

    return(
        <div>
            <h2>Admin Dashboard-{cookies.userid} Singed In</h2>
            <button onClick={handleLogout} className="btn btn-link">Logout</button>
        </div>
    )
}
 export default class IndexComponent extends React.Component{
    render(){
        return(
            <div className="container-fluid">
                <Router>
                    <header className="bg-danger text-white text-center p-2 mt-2">
                        <h2><span className="bi bi-cart-4"></span>I-Shop</h2>
                    </header>
                    <div className="mt-2 row">
                        <div className="col-3">
                            <div className="mt-2">
                                <Link className="btn btn-danger w-100" to="/adminregister">
                                Admin Register
                                </Link>
                            </div>
                            <div className="mt-2">
                                <Link className="btn btn-danger w-100" to="/adminlogin">Admin Login</Link>
                            </div>
                            <div className="mt-2">
                                <Link className="btn btn-danger w-100" t0="/admindashboard">Admin Dashboard</Link>
                            </div>

                        </div>
                        <div className="col-9">
                            <Switch>
                                <Route exact path="/adminregister">
                                <RegisterAdmin/>

                                </Route>
                                <Route exact path="/adminlogin">
                                <LoginComponent/>
                                </Route>
                                <Route exact path="/admindashboard">
                                <AdminDashBoard/>
                                </Route>
                            </Switch>
                        </div>
                    </div>
                </Router>
            </div>
        )
    }
 }